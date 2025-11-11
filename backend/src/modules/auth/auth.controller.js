import bcrypt from 'bcryptjs';
import User from '../../models/User.js';
import Organization from '../../models/Organization.js';
import Membership from '../../models/Membership.js';
import { env } from '../../config/env.js';
import {
  issueTokens,
  rotateRefreshToken,
  revokeRefreshToken,
  getRefreshSession,
  setOrgVersion,
  isOrgDisabled,
} from '../../services/tokenService.js';
import { setAuthCookies, clearAuthCookies } from '../../utils/authCookies.js';

/**
 * Handle user registration for basic accounts.
 */
export async function signup(req, res) {
  const { email, password, name } = req.body;
  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ error: 'Email exists' });

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ email, password: hashed, name });
  res.json({ id: user._id, email: user.email });
}

/**
 * Authenticate a user and mint access + refresh tokens.
 * Access token returns both in cookies and payload so the frontend
 * can mirror it in the Authorization header without re-parsing cookies.
 */
export async function login(req, res) {
  const { email, password, orgId: incomingOrgId } = req.body;

  const user = await User.findOne({ email });


  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  let orgId = incomingOrgId || null;
  let orgVersion = null;

  if (user.isSuper) {
    if (orgId) return res.status(400).json({ error: "Super admin doesn't belong to orgs" });
  } else {
    if (!orgId) {
      const memberships = await Membership.find({ userId: user._id });
      if (!memberships.length) {
        return res.status(403).json({ error: 'No organization found for this user' });
      }
      orgId = memberships[0].orgId.toString();
    }

    const org = await Organization.findById(orgId);
    if (!org || org.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Organization is disabled or not found' });
    }

    const member = await Membership.findOne({ userId: user._id, orgId });
    if (!member) return res.status(403).json({ error: 'No access to org' });

    if (member.disabled) {
      return res.status(403).json({ error: 'Your account has been disabled by the organization admin' });
    }

    orgVersion = org.authVersion ?? 0;
    await setOrgVersion(orgId, orgVersion);
  }

  const tokens = await issueTokens({
    userId: user._id.toString(),
    orgId: user.isSuper ? null : orgId?.toString(),
    orgVersion,
    isSuper: !!user.isSuper,
  });

  setAuthCookies(res, tokens);

  res.json({
    ok: true,
    isSuper: user.isSuper,
    userId: user._id,
    orgId: user.isSuper ? null : orgId,
    accessToken: tokens.accessToken,
    expiresIn: env.ACCESS_TOKEN_TTL,
  });
}

/**
 * Rotate the refresh token when the access token expires.
 */
export async function refresh(req, res) {
  const refreshToken = req.cookies?.[env.REFRESH_TOKEN_COOKIE];
  if (!refreshToken) {
    clearAuthCookies(res);
    return res.status(401).json({ error: 'Missing refresh token' });
  }

  const session = await getRefreshSession(refreshToken);
  if (!session) {
    clearAuthCookies(res);
    return res.status(401).json({ error: 'Invalid refresh token' });
  }

  const { payload } = session;
  if (payload.orgId) {
    const disabled = await isOrgDisabled(payload.orgId);
    if (disabled) {
      await revokeRefreshToken(refreshToken);
      clearAuthCookies(res);
      return res.status(403).json({ error: 'Organization access revoked' });
    }
  }

  const tokens = await rotateRefreshToken(refreshToken, session);
  if (!tokens) {
    clearAuthCookies(res);
    return res.status(401).json({ error: 'Invalid refresh token' });
  }

  setAuthCookies(res, tokens);
  res.json({ ok: true, accessToken: tokens.accessToken, expiresIn: env.ACCESS_TOKEN_TTL });
}

/**
 * Revoke an active refresh token and clear the auth cookies.
 */
export async function logout(req, res) {
  const refreshToken = req.cookies?.[env.REFRESH_TOKEN_COOKIE];
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }
  clearAuthCookies(res);
  res.json({ ok: true });
}

/**
 * Resolve the current viewer identity for client bootstrapping.
 */
export async function me(req, res) {
  try {
    const { userId, orgId } = req.auth || {};
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const user = await User.findById(userId).select('_id email name isSuper');
    if (!user) return res.status(404).json({ error: 'User not found' });

    let role = null;
    if (orgId) {
      const member = await Membership.findOne({ userId, orgId }).select('role');
      role = member?.role ?? null;
    }

    res.json({ user, orgId: orgId ?? null, role });
  } catch (e) {
    console.error('GET /auth/me error:', e);
    res.status(500).json({ error: 'Server error' });
  }
}

