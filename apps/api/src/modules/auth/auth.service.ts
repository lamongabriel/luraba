import type {
  AuthHousehold,
  AuthProviders,
  AuthSession,
  SessionUser,
  UpdateUserPreferencesInput,
  UserPreferences,
} from '@luraba/contracts/auth';
import { env } from '@/config/env';
import { getPermissionsForRole } from '@/config/permissions';
import { currenciesRepository } from '@/modules/currencies/currencies.repository';
import { householdsRepository } from '@/modules/households/households.repository';
import { NotFoundError } from '@/shared/errors';
import { logger } from '@/shared/logger';
import { authRepository } from './auth.repository';
import type { UserRecord } from './auth.types';

function mapUserRecordToSessionUser(user: UserRecord): SessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    defaultHouseholdId: user.defaultHouseholdId,
    preferences: {
      language: user.preferredLanguage,
      currency: user.preferredCurrency,
      timezone: user.preferredTimezone,
      dateFormat: user.preferredDateFormat,
      preferredPeriod: user.preferredPeriod,
      preferredTheme: user.preferredTheme,
    },
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

async function findRequiredUser(userId: string): Promise<UserRecord> {
  const user = await authRepository.findById(userId);
  if (!user) throw new NotFoundError('User');
  return user;
}

async function getSessionHousehold(
  userId: string,
  householdId: string,
): Promise<AuthHousehold | null> {
  const membership = await householdsRepository.findMembership(householdId, userId);
  if (!membership) throw new NotFoundError('Household membership');

  return {
    id: householdId,
    name: membership.householdName,
    role: membership.role,
    permissions: getPermissionsForRole(membership.role),
    settings: {
      defaultCurrencyId: membership.defaultCurrencyId,
      countryCode: membership.countryCode,
      timezone: membership.timezone,
      budgetMonthStartsOn: membership.budgetMonthStartsOn,
      creditExpenseTiming: membership.creditExpenseTiming,
      creditInstallmentBudgetMode: membership.creditInstallmentBudgetMode,
    },
  };
}

async function buildSession(userId: string, householdId: string | null): Promise<AuthSession> {
  const household = householdId ? await getSessionHousehold(userId, householdId) : null;
  const user = await findRequiredUser(userId);

  return {
    user: mapUserRecordToSessionUser(user),
    household,
  };
}

export async function getMe(userId: string, householdId: string | null): Promise<AuthSession> {
  const session = await buildSession(userId, householdId);

  void authRepository.touchLastActive(userId).catch((error) => {
    logger.warn({ err: error, userId }, 'Failed to update user activity');
  });

  return session;
}

export function getProviders(): AuthProviders {
  return {
    emailPassword: true,
    socialProviders: {
      google: env.authProviders.google.enabled,
      github: env.authProviders.github.enabled,
    },
  };
}

export async function getMyPreferences(userId: string): Promise<UserPreferences> {
  const preferences = await authRepository.getUserPreferences(userId);
  if (!preferences) throw new NotFoundError('User');
  return preferences;
}

export async function updateMyPreferences(
  userId: string,
  dto: UpdateUserPreferencesInput,
): Promise<UserPreferences> {
  await findRequiredUser(userId);

  if (dto.currency) {
    const currency = await currenciesRepository.findByCode(dto.currency);
    if (!currency) throw new NotFoundError('Currency');
  }

  const preferences = await authRepository.updateUserPreferences(userId, dto);
  if (!preferences) throw new NotFoundError('User');
  return preferences;
}
