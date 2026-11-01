import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";
import { safeNext } from "@/lib/safe-next";

const protectedPrefixes = [
  "/accounts",
  "/dashboard",
  "/settings",
  "/household",
  "/transactions",
  "/oauth",
];

function apiOrigin() {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
}

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isGuestPath(pathname: string) {
  return pathname === "/login" || pathname === "/register";
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hasSessionCookie = Boolean(getSessionCookie(request));

  if (isGuestPath(pathname) && hasSessionCookie) {
    const next = safeNext(request.nextUrl.searchParams.get("next"), apiOrigin());
    return NextResponse.redirect(
      next ? new URL(next, request.url) : new URL("/dashboard", request.url),
    );
  }

  if (isProtectedPath(pathname) && !hasSessionCookie) {
    const login = new URL("/login", request.url);
    if (pathname.startsWith("/oauth")) {
      login.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    }
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/accounts/:path*",
    "/dashboard/:path*",
    "/login",
    "/register",
    "/settings/:path*",
    "/household/:path*",
    "/households/:path*",
    "/transactions/:path*",
    "/oauth/:path*",
  ],
};
