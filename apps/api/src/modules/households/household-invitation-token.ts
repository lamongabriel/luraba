import { createHash, randomBytes } from "node:crypto";

const TOKEN_DOMAIN = "luraba:household-invitation:";

export function createHouseholdInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashHouseholdInvitationToken(token: string): string {
  return createHash("sha256").update(`${TOKEN_DOMAIN}${token}`).digest("hex");
}
