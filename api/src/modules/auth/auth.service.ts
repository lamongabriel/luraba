import { getPermissionsForRole } from '@/config/permissions';
import { currenciesRepository } from '@/modules/currencies/currencies.repository';
import * as householdsRepository from '@/modules/households/households.repository';
import * as householdsService from '@/modules/households/households.service';
import {
  hashPassword,
  signAccessToken,
  verifyPassword,
} from '@/shared/auth';
import { ConflictError, NotFoundError, UnauthorizedError } from '@/shared/errors';
import { authRepository } from './auth.repository';
import type {
  AuthHousehold,
  AuthSession,
  LoginRequestBody,
  LoginResponse,
  RegisterRequestBody,
  RegisterResponse,
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
  const resolvedHouseholdId = householdId ?? (await householdsService.createDefaultHouseholdForUser(userId));
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

export async function register(dto: RegisterRequestBody): Promise<RegisterResponse> {
  const existing = await authRepository.findByEmail(dto.email);
  if (existing) throw new ConflictError('A user with this email already exists');

  const preferredCurrency = dto.preferences.currency;
  if (preferredCurrency) {
    const currency = await currenciesRepository.findByCode(preferredCurrency);
    if (!currency) throw new NotFoundError('Currency');
  }

  const defaultHouseholdCurrency = dto.household.settings.defaultCurrencyId;
  if (defaultHouseholdCurrency && defaultHouseholdCurrency !== preferredCurrency) {
    const currency = await currenciesRepository.findByCode(defaultHouseholdCurrency);
    if (!currency) throw new NotFoundError('Currency');
  }

  const passwordHash = await hashPassword(dto.password);
  const user = await authRepository.create({
    name: dto.name,
    email: dto.email,
    passwordHash,
    preferredLanguage: dto.preferences.language,
    preferredCurrency,
    preferredTimezone: dto.preferences.timezone,
    preferredDateFormat: dto.preferences.dateFormat,
    preferredPeriod: dto.preferences.preferredPeriod,
    preferredTheme: dto.preferences.preferredTheme,
  });

  await householdsService.createDefaultHouseholdForUser(user.id, {
    name: dto.household.name,
    description: dto.household.description,
    defaultCurrencyId: dto.household.settings.defaultCurrencyId,
    countryCode: dto.household.settings.countryCode,
    timezone: dto.household.settings.timezone,
    budgetMonthStartsOn: dto.household.settings.budgetMonthStartsOn,
    creditExpenseTiming: dto.household.settings.creditExpenseTiming,
    creditInstallmentBudgetMode: dto.household.settings.creditInstallmentBudgetMode,
  });
  await householdsService.acceptPendingInvitesForUser(user.id, user.email);

  const session = await buildSession(user.id);
  const accessToken = signAccessToken(user.id, user.email);

  return {
    ...session,
    accessToken,
  };
}

export async function login(dto: LoginRequestBody): Promise<LoginResponse> {
  const user = await authRepository.findByEmail(dto.email);
  if (!user) throw new UnauthorizedError('Invalid email or password');

  const isValid = await verifyPassword(dto.password, user.passwordHash);
  if (!isValid) throw new UnauthorizedError('Invalid email or password');

  const session = await buildSession(user.id);
  const accessToken = signAccessToken(user.id, user.email);

  return {
    ...session,
    accessToken,
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

export async function updateMyPreferences(userId: string, dto: UpdateMyPreferencesRequestBody): Promise<UserPreferences> {
  await findRequiredUser(userId);

  if (dto.currency) {
    const currency = await currenciesRepository.findByCode(dto.currency);
    if (!currency) throw new NotFoundError('Currency');
  }

  const preferences = await authRepository.updateUserPreferences(userId, dto);
  if (!preferences) throw new NotFoundError('User');
  return preferences;
}
