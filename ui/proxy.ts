import { NextResponse, type NextRequest } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

const protectedPrefixes = [
  "/accounts",
  "/budgets",
  "/bugdets",
  "/categories",
  "/dashboard",
  "/reports",
  "/settings",
  "/tags",
  "/transactions",
]

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

function isGuestPath(pathname: string) {
  return pathname === "/login" || pathname === "/register"
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const hasSessionCookie = Boolean(getSessionCookie(request))

  if (isGuestPath(pathname) && hasSessionCookie) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  if (isProtectedPath(pathname) && !hasSessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/accounts/:path*",
    "/budgets/:path*",
    "/bugdets/:path*",
    "/categories/:path*",
    "/dashboard/:path*",
    "/login",
    "/register",
    "/reports/:path*",
    "/settings/:path*",
    "/tags/:path*",
    "/transactions/:path*",
  ],
}
