import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAMES: string[] = [
  process.env.NEXT_PUBLIC_ACCESS_TOKEN_COOKIE,
  process.env.NEXT_PUBLIC_REFRESH_TOKEN_COOKIE,
  process.env.NEXT_PUBLIC_SESSION_COOKIE,
  "session",
  "access_token",
  "refresh_token",
].filter((name): name is string => typeof name === "string" && name.length > 0);

const hasAuthCookies = (req: NextRequest) =>
  COOKIE_NAMES.some((name) => req.cookies.get(name)?.value);

const PUBLIC_ROUTES = ["/login", "/invite"];
const SUPER_ROUTES = ["/super"];
const ADMIN_ROUTES = ["/admin"];
const USER_ROUTES = ["/dashboard", "/items"];

/**
 * Next.js proxy hook (replacement for middleware in v16+).
 * Runs on every navigation and gatekeeps protected routes based on cookies.
 */
export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (
    PUBLIC_ROUTES.some((p) => path.startsWith(p)) ||
    path.startsWith("/_next") ||
    path.startsWith("/api") ||
    path === "/" ||
    path.startsWith("/favicon.ico")
  ) {
    if (path.startsWith("/login") && hasAuthCookies(req)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  const protectedPaths = [...SUPER_ROUTES, ...ADMIN_ROUTES, ...USER_ROUTES];
  const needsAuth = protectedPaths.some((p) => path.startsWith(p));
  const authed = hasAuthCookies(req);

  if (path.startsWith("/login") && authed) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (needsAuth && !authed) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: ["/((?!_next|favicon.ico|api).*)"],
};

