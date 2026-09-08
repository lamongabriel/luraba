import { env } from "@/config/env";

export const apiConfig = {
  authBaseUrl: `${env.apiUrl}/api/auth`,
  origin: env.apiUrl,
  restBaseUrl: `${env.apiUrl}/api/v1`,
} as const;
