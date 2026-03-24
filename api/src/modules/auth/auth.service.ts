import { ConflictError, UnauthorizedError, NotFoundError } from '@/shared/errors';
import {
  hashPassword,
  signAccessToken,
  signRefreshToken,
  verifyPassword,
  verifyRefreshToken,
} from '@/shared/auth';
import * as authRepository from './auth.repository';
import { LoginDto, RegisterDto } from './auth.types';

type SafeUser = {
  id: number;
  name: string;
  email: string;
  preferences: {
    language: 'en' | 'pt-BR';
    currency: 'BRL' | 'USD' | 'EUR';
    timezone: 'America/Sao_Paulo' | 'UTC';
    dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
    defaultPeriod:
      | 'last_day'
      | 'current_week'
      | 'last_7_days'
      | 'current_month'
      | 'last_month'
      | 'last_30_days'
      | 'last_90_days'
      | 'current_year'
      | 'last_365_days'
      | 'last_5_years'
      | 'last_10_years'
      | 'all_time';
    defaultAccountOrder: 'name_asc' | 'name_desc' | 'newest' | 'oldest';
    countryCode: 'BR' | 'US';
    budgetMonthStartsOn: number;
    theme: 'light' | 'dark' | 'system';
  };
  createdAt: Date;
  updatedAt: Date;
};

function toSafeUser(user: {
  id: number;
  name: string;
  email: string;
  preferredLanguage: SafeUser['preferences']['language'];
  preferredCurrency: SafeUser['preferences']['currency'];
  preferredTimezone: SafeUser['preferences']['timezone'];
  preferredDateFormat: SafeUser['preferences']['dateFormat'];
  defaultPeriod: SafeUser['preferences']['defaultPeriod'];
  defaultAccountOrder: SafeUser['preferences']['defaultAccountOrder'];
  countryCode: SafeUser['preferences']['countryCode'];
  budgetMonthStartsOn: number;
  themePreference: SafeUser['preferences']['theme'];
  createdAt: Date;
  updatedAt: Date;
}): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    preferences: {
      language: user.preferredLanguage,
      currency: user.preferredCurrency,
      timezone: user.preferredTimezone,
      dateFormat: user.preferredDateFormat,
      defaultPeriod: user.defaultPeriod,
      defaultAccountOrder: user.defaultAccountOrder,
      countryCode: user.countryCode,
      budgetMonthStartsOn: user.budgetMonthStartsOn,
      theme: user.themePreference,
    },
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function register(dto: RegisterDto): Promise<{
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
}> {
  const existing = await authRepository.findUserByEmail(dto.email);
  if (existing) throw new ConflictError('A user with this email already exists');

  const passwordHash = await hashPassword(dto.password);
  const user = await authRepository.createUser({
    name: dto.name,
    email: dto.email,
    passwordHash,
  });

  const accessToken = signAccessToken(user.id, user.email);
  const refreshToken = signRefreshToken(user.id, user.email);

  return {
    user: toSafeUser(user),
    accessToken,
    refreshToken,
  };
}

export async function login(dto: LoginDto): Promise<{
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
}> {
  const user = await authRepository.findUserByEmail(dto.email);
  if (!user) throw new UnauthorizedError('Invalid email or password');

  const isValid = await verifyPassword(dto.password, user.passwordHash);
  if (!isValid) throw new UnauthorizedError('Invalid email or password');

  const accessToken = signAccessToken(user.id, user.email);
  const refreshToken = signRefreshToken(user.id, user.email);

  return {
    user: toSafeUser(user),
    accessToken,
    refreshToken,
  };
}

export async function refresh(refreshToken: string): Promise<{
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
}> {
  const payload = verifyRefreshToken(refreshToken);
  const user = await authRepository.findUserById(Number(payload.sub));
  if (!user) throw new UnauthorizedError('Invalid refresh token');

  const newAccessToken = signAccessToken(user.id, user.email);
  const newRefreshToken = signRefreshToken(user.id, user.email);

  return {
    user: toSafeUser(user),
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

export async function getMe(userId: number): Promise<SafeUser> {
  const user = await authRepository.findUserById(userId);
  if (!user) throw new NotFoundError('User');

  return toSafeUser(user);
}