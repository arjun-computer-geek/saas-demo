import crypto from 'crypto';
import { redis } from '../config/redis.js';
import { env } from '../config/env.js';
import { signAccessToken } from '../utils/jwt.js';

/**
 * Token and session utilities backed by Redis.
 * - Access tokens are stateless JWTs (short TTL) signed with env.JWT_SECRET.
 * - Refresh tokens are opaque random strings stored in Redis, enabling instant revocation.
 * - Organization disable/version markers are cached in Redis so we can revoke instantly
 *   without hitting Mongo on every request.
 */

const REFRESH_KEY_PREFIX = 'refresh:';
const ORG_REFRESH_SET_PREFIX = 'org-refresh:';
const DISABLED_ORGS_SET = 'orgs:disabled';
const ORG_VERSION_PREFIX = 'org-version:';

function refreshKey(token) {
  return `${REFRESH_KEY_PREFIX}${token}`;
}

function orgSetKey(orgId) {
  return `${ORG_REFRESH_SET_PREFIX}${orgId}`;
}

function orgVersionKey(orgId) {
  return `${ORG_VERSION_PREFIX}${orgId}`;
}

export async function issueTokens({
  userId,
  orgId = null,
  orgVersion = null,
  isSuper = false,
}) {
  const payload = {
    userId,
    orgId,
    orgVersion,
    isSuper,
  };

  const accessToken = signAccessToken(payload);
  const refreshToken = crypto.randomBytes(48).toString('hex');
  const key = refreshKey(refreshToken);
  const data = JSON.stringify(payload);

  const ttl = env.REFRESH_TOKEN_TTL;
  const commands = redis.multi();
  commands.set(key, data, 'EX', ttl);
  if (orgId) {
    const setKey = orgSetKey(orgId);
    commands.sadd(setKey, key);
    commands.expire(setKey, ttl);
  }
  await commands.exec();

  return { accessToken, refreshToken };
}

export async function getRefreshSession(refreshToken) {
  if (!refreshToken) return null;
  const key = refreshKey(refreshToken);
  const stored = await redis.get(key);
  if (!stored) return null;
  const payload = JSON.parse(stored);
  return { key, payload };
}

export async function revokeRefreshToken(refreshToken) {
  if (!refreshToken) return;
  const key = refreshKey(refreshToken);
  const stored = await redis.get(key);
  if (!stored) {
    return;
  }
  const payload = JSON.parse(stored);
  const commands = redis.multi();
  commands.del(key);
  if (payload.orgId) {
    commands.srem(orgSetKey(payload.orgId), key);
  }
  await commands.exec();
}

export async function rotateRefreshToken(refreshToken, sessionOverride = null) {
  const session = sessionOverride ?? await getRefreshSession(refreshToken);
  if (!session) return null;
  const { payload } = session;
  if (payload.orgId) {
    const disabled = await isOrgDisabled(payload.orgId);
    if (disabled) {
      await revokeRefreshToken(refreshToken);
      return null;
    }
    const version = await getOrgVersion(payload.orgId);
    if (version !== null) {
      payload.orgVersion = version;
    }
  }
  await revokeRefreshToken(refreshToken);
  return issueTokens(payload);
}

export async function revokeOrgRefreshTokens(orgId) {
  if (!orgId) return;
  const setKey = orgSetKey(orgId);
  const members = await redis.smembers(setKey);
  if (!members.length) {
    await redis.del(setKey);
    return;
  }
  const commands = redis.multi();
  for (const key of members) {
    commands.del(key);
  }
  commands.del(setKey);
  await commands.exec();
}

export async function setOrgVersion(orgId, version) {
  if (!orgId) return;
  if (version === undefined || version === null) {
    await redis.del(orgVersionKey(orgId));
    return;
  }
  await redis.set(orgVersionKey(orgId), version.toString());
}

export async function getOrgVersion(orgId) {
  if (!orgId) return null;
  const version = await redis.get(orgVersionKey(orgId));
  return version ? Number(version) : null;
}

export async function markOrgDisabled(orgId) {
  if (!orgId) return;
  await redis.sadd(DISABLED_ORGS_SET, orgId.toString());
}

export async function markOrgEnabled(orgId) {
  if (!orgId) return;
  await redis.srem(DISABLED_ORGS_SET, orgId.toString());
}

export async function isOrgDisabled(orgId) {
  if (!orgId) return false;
  return redis.sismember(DISABLED_ORGS_SET, orgId.toString());
}

