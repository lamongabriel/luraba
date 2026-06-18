import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { createAuthMiddleware } from 'better-auth/api';
import { betterAuth } from 'better-auth/minimal';
import type { Auth, BetterAuthOptions } from 'better-auth/types';
import { env } from '@/config/env';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { authRepository } from '@/modules/auth/auth.repository';
import * as authService from '@/modules/auth/auth.service';
import * as householdsService from '@/modules/households/households.service';
import { allowedAuthOrigins } from '@/shared/lib/auth-origins';
import {
  DATE_FORMAT_VALUES,
  LANGUAGE_VALUES,
  PREFERRED_PERIOD_VALUES,
  PREFERRED_THEME_VALUES,
  TIMEZONE_VALUES,
} from '@/shared/validation/preferences';

const authPayloadPaths = new Set(['/sign-up/email', '/sign-in/email']);

const additionalUserFields = {
  defaultHouseholdId: {
    type: 'string',
    required: false,
    input: false,
  },
  preferredLanguage: {
    type: LANGUAGE_VALUES,
    required: false,
    defaultValue: 'en',
  },
  preferredCurrency: {
    type: 'string',
    required: false,
    defaultValue: 'BRL',
  },
  preferredTimezone: {
    type: TIMEZONE_VALUES,
    required: false,
    defaultValue: 'America/Sao_Paulo',
  },
  preferredDateFormat: {
    type: DATE_FORMAT_VALUES,
    required: false,
    defaultValue: 'DD/MM/YYYY',
  },
  preferredPeriod: {
    type: PREFERRED_PERIOD_VALUES,
    required: false,
    defaultValue: 'current_month',
  },
  preferredTheme: {
    type: PREFERRED_THEME_VALUES,
    required: false,
    defaultValue: 'system',
  },
} as const;

function resolveSocialProvider(provider: {
  clientId: string | undefined;
  clientSecret: string | undefined;
}) {
  if (!provider.clientId || !provider.clientSecret) {
    return null;
  }

  return {
    clientId: provider.clientId,
    clientSecret: provider.clientSecret,
  };
}

const googleProvider = resolveSocialProvider(env.authProviders.google);
const githubProvider = resolveSocialProvider(env.authProviders.github);

const socialProviders = {
  ...(googleProvider ? { google: googleProvider } : {}),
  ...(githubProvider ? { github: githubProvider } : {}),
};

function shouldEnrichAuthPayload(path: string): boolean {
  return authPayloadPaths.has(path);
}

function getReturnedUserId(returned: unknown): string | null {
  if (
    !returned ||
    typeof returned !== 'object' ||
    !('user' in returned) ||
    !returned.user ||
    typeof returned.user !== 'object' ||
    !('id' in returned.user) ||
    typeof returned.user.id !== 'string'
  ) {
    return null;
  }

  return returned.user.id;
}

async function syncNewUserHousehold(user: { id: string; email: string } | null | undefined) {
  if (!user) {
    return;
  }

  await householdsService.createDefaultHouseholdForUser(user.id);
  await householdsService.acceptPendingInvitesForUser(user.id, user.email);
}

async function enrichAuthPayload(returned: object, userId: string) {
  const householdId = await householdsService.createDefaultHouseholdForUser(userId);
  const [user, session] = await Promise.all([
    authRepository.findById(userId),
    authService.getMe(userId, householdId),
  ]);

  if (!user) {
    return returned;
  }

  return {
    ...returned,
    user,
    household: session.household,
  };
}

const authOptions: BetterAuthOptions = {
  baseURL: env.baseUrl,
  secret: env.authSecret,
  trustedOrigins: allowedAuthOrigins,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  databaseHooks: {
    user: {
      create: {
        after: syncNewUserHousehold,
      },
    },
  },
  advanced: {
    database: {
      generateId: 'uuid',
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (!shouldEnrichAuthPayload(ctx.path)) {
        return;
      }

      const userId = getReturnedUserId(ctx.context.returned);
      if (!userId || !ctx.context.returned || typeof ctx.context.returned !== 'object') {
        return;
      }

      ctx.context.returned = await enrichAuthPayload(ctx.context.returned, userId);
    }),
  },
  ...(Object.keys(socialProviders).length > 0 ? { socialProviders } : {}),
  user: {
    modelName: 'users',
    additionalFields: additionalUserFields,
  },
  session: {
    modelName: 'authSessions',
  },
  account: {
    modelName: 'authAccounts',
  },
  verification: {
    modelName: 'authVerifications',
  },
};

export const auth: Auth<BetterAuthOptions> = betterAuth(authOptions);
