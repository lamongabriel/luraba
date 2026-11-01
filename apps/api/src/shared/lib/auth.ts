import { apiKey } from "@better-auth/api-key";
import {
  API_KEY_MAX_EXPIRY_DAYS,
  API_KEY_NAME_MAX_LENGTH,
  API_KEY_PREFIX,
} from "@luraba/contracts";
import * as schema from "@luraba/db/schema";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";
import { betterAuth } from "better-auth/minimal";
import { env } from "@/config/env";
import { db } from "@/db";
import { authRepository } from "@/modules/auth/auth.repository";
import * as authService from "@/modules/auth/auth.service";
import { provisionHouseholdForUser } from "@/modules/households/households.lifecycle";
import { allowedAuthOrigins } from "@/shared/lib/auth-origins";
import {
  DATE_FORMAT_VALUES,
  LANGUAGE_VALUES,
  PREFERRED_PERIOD_VALUES,
  PREFERRED_THEME_VALUES,
} from "@/shared/validation/preferences";

// Per key: 600 requests a minute, enough for an agent that pages through data and applies bulk edits.
const API_KEY_RATE_LIMIT_WINDOW_MS = 60_000;
const API_KEY_RATE_LIMIT_MAX = 600;

const authPayloadPaths = new Set(["/sign-up/email", "/sign-in/email"]);

const additionalUserFields = {
  defaultHouseholdId: { type: "string", required: false, input: false },
  preferredLanguage: { type: LANGUAGE_VALUES, required: false, defaultValue: "en" },
  preferredCurrency: { type: "string", required: false, defaultValue: "BRL" },
  preferredTimezone: {
    type: "string",
    input: false,
    required: false,
    defaultValue: "America/Sao_Paulo",
  },
  preferredDateFormat: {
    type: DATE_FORMAT_VALUES,
    required: false,
    defaultValue: "DD/MM/YYYY",
  },
  preferredPeriod: {
    type: PREFERRED_PERIOD_VALUES,
    required: false,
    defaultValue: "current_month",
  },
  preferredTheme: {
    type: PREFERRED_THEME_VALUES,
    required: false,
    defaultValue: "system",
  },
} as const;

function resolveSocialProvider(provider: {
  clientId: string | undefined;
  clientSecret: string | undefined;
}) {
  if (!provider.clientId || !provider.clientSecret) return null;
  return { clientId: provider.clientId, clientSecret: provider.clientSecret };
}

const googleProvider = resolveSocialProvider(env.authProviders.google);
const githubProvider = resolveSocialProvider(env.authProviders.github);
const socialProviders = {
  ...(googleProvider ? { google: googleProvider } : {}),
  ...(githubProvider ? { github: githubProvider } : {}),
};

function getReturnedUser(returned: unknown): { id: string; email: string } | null {
  if (
    !returned ||
    typeof returned !== "object" ||
    !("user" in returned) ||
    !returned.user ||
    typeof returned.user !== "object" ||
    !("id" in returned.user) ||
    typeof returned.user.id !== "string" ||
    !("email" in returned.user) ||
    typeof returned.user.email !== "string"
  ) {
    return null;
  }

  return { id: returned.user.id, email: returned.user.email };
}

async function syncNewUserHousehold(user: { id: string; email: string } | null | undefined) {
  if (user) await provisionHouseholdForUser(user);
}

async function enrichAuthPayload(returned: object, user: { id: string; email: string }) {
  const householdId = await provisionHouseholdForUser(user);
  const [record, session] = await Promise.all([
    authRepository.findById(user.id),
    authService.getMe(user.id, householdId),
  ]);

  if (!record) return returned;
  return { ...returned, user: record, household: session.household };
}

const authOptions = {
  baseURL: env.baseUrl,
  secret: env.authSecret,
  trustedOrigins: allowedAuthOrigins,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  databaseHooks: {
    user: { create: { after: syncNewUserHousehold } },
  },
  advanced: { database: { generateId: "uuid" as const } },
  emailAndPassword: { enabled: true },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (!authPayloadPaths.has(ctx.path)) return;

      const user = getReturnedUser(ctx.context.returned);
      if (!user || !ctx.context.returned || typeof ctx.context.returned !== "object") return;

      ctx.context.returned = await enrichAuthPayload(ctx.context.returned, user);
    }),
  },
  ...(Object.keys(socialProviders).length > 0 ? { socialProviders } : {}),
  user: { modelName: "users", additionalFields: additionalUserFields },
  plugins: [
    apiKey({
      defaultPrefix: API_KEY_PREFIX,
      requireName: true,
      maximumNameLength: API_KEY_NAME_MAX_LENGTH,
      enableMetadata: true,
      // Requests are authenticated by `authenticateRequest` (access middleware) through
      // `auth.api.verifyApiKey`, not by turning the key into a Better Auth session.
      enableSessionForAPIKeys: false,
      startingCharactersConfig: { shouldStore: true, charactersLength: 10 },
      keyExpiration: { maxExpiresIn: API_KEY_MAX_EXPIRY_DAYS, minExpiresIn: 1 },
      rateLimit: {
        enabled: true,
        timeWindow: API_KEY_RATE_LIMIT_WINDOW_MS,
        maxRequests: API_KEY_RATE_LIMIT_MAX,
      },
      schema: { apikey: { modelName: "apiKeys" } },
    }),
  ],
  session: { modelName: "authSessions" },
  account: { modelName: "authAccounts" },
  verification: { modelName: "authVerifications" },
};

export const auth = betterAuth(authOptions);
