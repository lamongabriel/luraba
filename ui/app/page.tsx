import { getSessionCookie } from "better-auth/cookies"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export default async function HomePage() {
  const requestHeaders = await headers()
  const hasSessionCookie = Boolean(getSessionCookie(requestHeaders))

  redirect(hasSessionCookie ? "/dashboard" : "/login")
}
