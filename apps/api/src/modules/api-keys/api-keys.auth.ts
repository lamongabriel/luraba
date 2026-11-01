import { API_KEY_PREFIX } from "@luraba/contracts";
import type { Request } from "express";
import { AppError, UnauthorizedError } from "@/shared/errors";
import { auth } from "@/shared/lib/auth";
import { apiKeysRepository } from "./api-keys.repository";

/**
 * The API key sent with a request, from `Authorization: Bearer lur_...` or `x-api-key: lur_...`.
 * A bearer token that is not a Luraba key is ignored (it is not ours to interpret).
 */
export function extractApiKey(req: Request): string | undefined {
  const headerKey = req.headers["x-api-key"];
  const fromHeader = (Array.isArray(headerKey) ? headerKey[0] : headerKey)?.trim();
  if (fromHeader) return fromHeader;

  const authorization = req.headers.authorization?.trim();
  if (!authorization) return undefined;
  const [scheme, token] = authorization.split(/\s+/u);
  if (scheme?.toLowerCase() === "bearer" && token?.startsWith(API_KEY_PREFIX)) return token;
  return undefined;
}

type VerifyError = { code?: string };

function errorFor(error: VerifyError | null): AppError {
  if (error?.code === "RATE_LIMITED" || error?.code === "USAGE_EXCEEDED") {
    return new AppError("API key rate limit exceeded, retry shortly", 429, "RATE_LIMITED");
  }
  return new UnauthorizedError("Invalid, disabled or expired API key");
}

/**
 * Verifies the key with Better Auth (hash lookup, enabled, expiry, rate limit, usage counters) and
 * resolves its owner. The caller then runs the same household and permission checks as for a session.
 */
export async function authenticateApiKey(key: string): Promise<{ id: string; email: string }> {
  const result = await auth.api.verifyApiKey({ body: { key } });
  if (!result.valid || !result.key) throw errorFor(result.error);

  const userId = result.key.referenceId;
  const email = await apiKeysRepository.findUserEmail(userId);
  if (!email) throw new UnauthorizedError("Invalid, disabled or expired API key");
  return { id: userId, email };
}
