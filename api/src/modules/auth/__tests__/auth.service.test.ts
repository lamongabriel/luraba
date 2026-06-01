import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { householdInvitesTable } from '@/db/schemas/households.schema';
import { householdsRepository } from '@/modules/households/households.repository';
import { ConflictError, NotFoundError, UnauthorizedError } from '@/shared/errors';
import { createAuthenticatedContext } from '@/test/auth';
import { buildRegisterInput, createHousehold, createHouseholdMembership } from '@/test/factories';
import { authRepository } from '../auth.repository';
import * as authService from '../auth.service';

describe('auth service', () => {
  it('register creates the user, default household, owner membership, and returns a session', async () => {
    const input = buildRegisterInput({
      name: 'Gabriel',
      email: 'gabriel@example.com',
      preferences: {
        currency: 'USD',
        timezone: 'UTC',
        preferredTheme: 'dark',
      },
      household: {
        name: 'Gabriel Household',
        settings: {
          defaultCurrencyId: 'USD',
          timezone: 'UTC',
        },
      },
    });

    const result = await authService.register(input);

    expect(result.accessToken).toBeTruthy();
    expect(result.user.name).toBe('Gabriel');
    expect(result.user.email).toBe('gabriel@example.com');
    expect(result.user.preferences.currency).toBe('USD');
    expect(result.user.preferences.timezone).toBe('UTC');
    expect(result.user.preferences.preferredTheme).toBe('dark');
    expect(result.user.defaultHouseholdId).toBe(result.household.id);
    expect(result.household.name).toBe('Gabriel Household');
    expect(result.household.role).toBe('owner');
    expect(result.household.settings.defaultCurrencyId).toBe('USD');
    expect(result.household.settings.timezone).toBe('UTC');

    const membership = await householdsRepository.findMembership(
      result.household.id,
      result.user.id,
    );
    expect(membership?.role).toBe('owner');
  });

  it('register rejects duplicate emails', async () => {
    const input = buildRegisterInput({
      email: 'duplicate@example.com',
    });

    await authService.register(input);

    await expect(authService.register(input)).rejects.toThrow(ConflictError);
  });

  it('register rejects unknown preferred currency', async () => {
    await expect(
      authService.register(
        buildRegisterInput({
          preferences: {
            currency: 'ZZZ',
          },
        }),
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it('register accepts pending invites for the registering email', async () => {
    const inviter = await createAuthenticatedContext();
    const invitedEmail = 'invitee@example.com';

    const invite = await householdsRepository.createInvite(inviter.household.id, inviter.user.id, {
      email: invitedEmail,
      role: 'member',
    });

    const result = await authService.register(
      buildRegisterInput({
        email: invitedEmail,
      }),
    );

    const membership = await householdsRepository.findMembership(
      inviter.household.id,
      result.user.id,
    );
    expect(membership?.role).toBe('member');

    const inviteRows = await db
      .select()
      .from(householdInvitesTable)
      .where(eq(householdInvitesTable.id, invite.id));
    expect(inviteRows[0]?.status).toBe('accepted');
    expect(inviteRows[0]?.acceptedAt).toBeTruthy();
  });

  it('login returns a session and token for valid credentials', async () => {
    const input = buildRegisterInput({
      email: 'login@example.com',
      password: '123123123',
    });

    await authService.register(input);

    const result = await authService.login({
      email: input.email,
      password: input.password,
    });

    expect(result.accessToken).toBeTruthy();
    expect(result.user.email).toBe(input.email);
    expect(result.household.role).toBe('owner');
  });

  it('login rejects invalid credentials', async () => {
    const input = buildRegisterInput({
      email: 'bad-login@example.com',
      password: '123123123',
    });

    await authService.register(input);

    await expect(
      authService.login({
        email: input.email,
        password: 'wrong-password',
      }),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('getMe returns the selected active household session', async () => {
    const context = await createAuthenticatedContext();
    const secondHousehold = await createHousehold(context.user.id, {
      name: 'Travel Household',
      createdByUserId: context.user.id,
    });
    await createHouseholdMembership(secondHousehold.id, context.user.id, 'admin');

    const session = await authService.getMe(context.user.id, secondHousehold.id);

    expect(session.user.id).toBe(context.user.id);
    expect(session.household.id).toBe(secondHousehold.id);
    expect(session.household.name).toBe('Travel Household');
    expect(session.household.role).toBe('admin');
  });

  it('getMyPreferences returns persisted preferences', async () => {
    const registered = await authService.register(
      buildRegisterInput({
        preferences: {
          language: 'pt-BR',
          currency: 'BRL',
          timezone: 'America/Sao_Paulo',
          dateFormat: 'DD/MM/YYYY',
          preferredPeriod: 'current_month',
          preferredTheme: 'system',
        },
      }),
    );

    const preferences = await authService.getMyPreferences(registered.user.id);

    expect(preferences.language).toBe('pt-BR');
    expect(preferences.currency).toBe('BRL');
    expect(preferences.timezone).toBe('America/Sao_Paulo');
  });

  it('updateMyPreferences persists changes and validates currency existence', async () => {
    const registered = await authService.register(buildRegisterInput());

    const updated = await authService.updateMyPreferences(registered.user.id, {
      currency: 'USD',
      preferredTheme: 'dark',
    });

    expect(updated.currency).toBe('USD');
    expect(updated.preferredTheme).toBe('dark');

    const stored = await authRepository.getUserPreferences(registered.user.id);
    expect(stored?.currency).toBe('USD');
    expect(stored?.preferredTheme).toBe('dark');

    await expect(
      authService.updateMyPreferences(registered.user.id, {
        currency: 'ZZZ',
      }),
    ).rejects.toThrow(NotFoundError);
  });
});
