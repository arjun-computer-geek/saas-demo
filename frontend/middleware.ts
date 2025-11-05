import { NextRequest, NextResponse } from "next/server";

// --- Define route groups ---
const PUBLIC_ROUTES = ["/login", "/invite"];
const SUPER_ROUTES = ["/super"];
const ADMIN_ROUTES = ["/admin"];
const USER_ROUTES = ["/dashboard", "/items"];

// --- Middleware core ---
export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // 🟢 Allow public pages and static files
  if (
    PUBLIC_ROUTES.some((p) => path.startsWith(p)) ||
    path.startsWith("/_next") ||
    path.startsWith("/api") ||
    path === "/" ||
    path.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  // 🔒 Protected routes
  const protectedPaths = [...SUPER_ROUTES, ...ADMIN_ROUTES, ...USER_ROUTES];
  const needsAuth = protectedPaths.some((p) => path.startsWith(p));

  // Check session cookie
  const cookie = req.cookies.get("session");

  if (needsAuth && !cookie) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 🧠 Role-based enforcement can happen here later (optional)
  // Example idea:
  // if (path.startsWith("/super") && !user.isSuper) redirect("/dashboard")

  return NextResponse.next();
}

// --- Matcher to apply middleware to all pages ---
export const config = {
  matcher: ["/((?!_next|favicon.ico|api).*)"],
};
