import { API_KEY_PREFIX } from "@luraba/contracts";
import type { Request } from "express";
import { apiKeysRepository } from "@/modules/api-keys/api-keys.repository";
import { UnauthorizedError } from "@/shared/errors";
import { auth } from "@/shared/lib/auth";
import { mcpRepository } from "./mcp.repository";

const LAST_USED_RESOLUTION_MS = 60_000;
const lastTouched = new Map<string, number>();

/** An OAuth access token (`Authorization: Bearer <token>`) that is not a Luraba API key. */
export function extractOAuthToken(req: Request): string | undefined {
  const [scheme, token] = (req.headers.authorization?.trim() ?? "").split(/\s+/u);
  if (scheme?.toLowerCase() !== "bearer" || !token || token.startsWith(API_KEY_PREFIX)) {
    return undefined;
  }
  return token;
}

/**
 * Resolves an access token issued to an MCP client to the user who allowed it. From here the request
 * takes the same household and permission path as a session or an API key: the agent can do what that
 * user can do, nothing more.
 */
export async function authenticateOAuthToken(
  token: string,
): Promise<{ id: string; email: string }> {
  const record = await auth.api.getMcpSession({
    headers: new Headers({ authorization: `Bearer ${token}` }),
  });
  const userId = record?.userId;
  if (!record || !userId) throw new UnauthorizedError("Invalid or expired access token");

  const email = await apiKeysRepository.findUserEmail(userId);
  if (!email) throw new UnauthorizedError("Invalid or expired access token");

  const now = Date.now();
  if (now - (lastTouched.get(token) ?? 0) > LAST_USED_RESOLUTION_MS) {
    lastTouched.set(token, now);
    void mcpRepository.touchToken(token).catch(() => undefined);
  }
  return { id: userId, email };
}
