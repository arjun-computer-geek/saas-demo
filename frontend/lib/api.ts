const DEFAULT_API_BASE = "/api";

function buildUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_BASE;
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

export async function api(path: string, init: RequestInit = {}) {
  const res = await fetch(buildUrl(path), {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}
