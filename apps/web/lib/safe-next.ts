const OAUTH_AUTHORIZE_PATH = "/api/auth/mcp/authorize";

/**
 * The page to open after signing in, from `?next=`. Only an app path (`/oauth/consent?...`) or the
 * API's OAuth authorize URL (an agent connecting) is accepted; anything else is ignored so the
 * login page can never be used as an open redirect.
 */
export function safeNext(next: string | null | undefined, apiOrigin: string): string | null {
  if (!next) return null;
  if (next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")) return next;
  try {
    const url = new URL(next);
    if (url.origin === new URL(apiOrigin).origin && url.pathname === OAUTH_AUTHORIZE_PATH) {
      return url.toString();
    }
  } catch {
    return null;
  }
  return null;
}
