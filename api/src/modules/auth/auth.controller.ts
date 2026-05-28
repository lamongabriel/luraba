import { createAuthenticatedHandler } from '@/shared/controllers/authenticated.controller';
import { createHouseholdHandler } from '@/shared/controllers/household.controller';
import { createHandler } from '@/shared/controllers/controller';
import * as authService from './auth.service';
import {
  GetMeResponseSchema,
  GetMyPreferencesResponseSchema,
  LoginRequestBodySchema,
  LoginResponseSchema,
  LogoutResponseSchema,
  RegisterRequestBodySchema,
  RegisterResponseSchema,
  UpdateMyPreferencesRequestBodySchema,
  UpdateMyPreferencesResponseSchema,
} from './auth.types';

export const register = createHandler({
  body: RegisterRequestBodySchema,
  response: RegisterResponseSchema,
  status: 'created',
  handle: ({ body }) => authService.register(body),
});

export const login = createHandler({
  body: LoginRequestBodySchema,
  response: LoginResponseSchema,
  handle: ({ body }) => authService.login(body),
});

export const logout = createHandler({
  response: LogoutResponseSchema,
  handle: async () => ({ ok: true as const }),
});

export const me = createHouseholdHandler({
  response: GetMeResponseSchema,
  handle: ({ household }) => authService.getMe(household.userId, household.householdId),
});

export const getMyPreferences = createAuthenticatedHandler({
  response: GetMyPreferencesResponseSchema,
  handle: ({ user }) => authService.getMyPreferences(user.id),
});

export const updateMyPreferences = createAuthenticatedHandler({
  body: UpdateMyPreferencesRequestBodySchema,
  response: UpdateMyPreferencesResponseSchema,
  handle: ({ user, body }) => authService.updateMyPreferences(user.id, body),
});
