const STORAGE_KEY =
  process.env.NEXT_PUBLIC_ACCESS_TOKEN_KEY || "saas-demo.access-token";

let accessToken: string | null = null;
let isLoaded = false;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function ensureLoaded() {
  if (!isLoaded && isBrowser()) {
    accessToken = window.localStorage.getItem(STORAGE_KEY);
    isLoaded = true;
  }
}

/**
 * Lightweight access token holder persisted in localStorage.
 * We still rely on the httpOnly refresh cookie for session rotation;
 * this cache mirrors the short-lived access token for Authorization headers.
 */
export function getAccessToken(): string | null {
  ensureLoaded();
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (!isBrowser()) {
    return;
  }
  if (token) {
    window.localStorage.setItem(STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  isLoaded = true;
}

export function clearAccessToken() {
  accessToken = null;
  if (!isBrowser()) {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
  isLoaded = true;
}