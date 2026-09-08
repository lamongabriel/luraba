import { env } from "@/config/env";

function toOrigin(url: string): string {
  return new URL(url).origin;
}

function getConfiguredOrigins(): string[] {
  return [env.baseUrl, env.frontendOrigin].map(toOrigin);
}

export const allowedAuthOrigins = [...new Set(getConfiguredOrigins())];
