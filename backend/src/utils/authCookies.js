import { env } from '../config/env.js';

const secure = env.NODE_ENV === 'production';

const baseCookieOptions = {
  httpOnly: true,
  secure,
  sameSite: 'lax',
  path: '/',
};

export function setAuthCookies(res, { refreshToken }) {
  res.cookie(env.REFRESH_TOKEN_COOKIE, refreshToken, {
    ...baseCookieOptions,
    maxAge: env.REFRESH_TOKEN_TTL * 1000,
  });
}

export function clearAuthCookies(res) {
  res.clearCookie(env.ACCESS_TOKEN_COOKIE, { path: '/' });
  res.clearCookie(env.REFRESH_TOKEN_COOKIE, { path: '/' });
}

