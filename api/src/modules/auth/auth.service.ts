import { getPermissionsForRole } from '@/config/permissions';
import { currenciesRepository } from '@/modules/currencies/currencies.repository';
import { householdsRepository } from '@/modules/households/households.repository';
import * as householdsService from '@/modules/households/households.service';
import { NotFoundError } from '@/shared/errors';
import { authRepository } from './auth.repository';
import type {
  AuthHousehold,
  AuthSession,
  SessionUser,
  UpdateMyPreferencesRequestBody,
  UserPreferences,
  UserRecord,
} from './auth.types';

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
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function findRequiredUser(userId: string): Promise<UserRecord> {
  const user = await authRepository.findById(userId);
  if (!user) throw new NotFoundError('User');
  return user;
}

async function getSessionHousehold(userId: string, householdId?: string): Promise<AuthHousehold> {
  const resolvedHouseholdId =
    householdId ?? (await householdsService.createDefaultHouseholdForUser(userId));
  const membership = await householdsRepository.findMembership(resolvedHouseholdId, userId);
  if (!membership) throw new NotFoundError('Household membership');

  return {
    id: resolvedHouseholdId,
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

async function buildSession(userId: string, householdId?: string): Promise<AuthSession> {
  const household = await getSessionHousehold(userId, householdId);
  const user = await findRequiredUser(userId);

  return {
    user: mapUserRecordToSessionUser(user),
    household,
  };
}

export async function getMe(userId: string, householdId: string): Promise<AuthSession> {
  return buildSession(userId, householdId);
}

export async function getMyPreferences(userId: string): Promise<UserPreferences> {
  const preferences = await authRepository.getUserPreferences(userId);
  if (!preferences) throw new NotFoundError('User');
  return preferences;
}

export async function updateMyPreferences(
  userId: string,
  dto: UpdateMyPreferencesRequestBody,
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
