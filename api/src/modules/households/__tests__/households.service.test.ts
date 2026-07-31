import { describe, expect, it } from 'vitest';
import { ValidationError } from '@/shared/errors';
import { createAuthenticatedContext } from '@/test/auth';
import { createUser } from '@/test/factories';
import {
  ListHouseholdInvitesRequestQuerySchema,
  ListHouseholdMembersRequestQuerySchema,
  ListHouseholdsRequestQuerySchema,
  ListMyHouseholdInvitesRequestQuerySchema,
} from '../households.query';
import { householdsRepository } from '../households.repository';
import * as householdsService from '../households.service';

describe('households service', () => {
  it('listHouseholds returns an empty page for a user with no households', async () => {
    const user = await createUser();

    const households = await householdsService.listHouseholds(
      user.id,
      ListHouseholdsRequestQuerySchema.parse({}),
    );

    expect(households.data).toEqual([]);

    const defaults = await householdsRepository.findUserDefaults(user.id);
    expect(defaults?.defaultHouseholdId).toBeNull();
  });

  it('createHousehold creates an owner membership for the creator', async () => {
    const context = await createAuthenticatedContext();

    const household = await householdsService.createHousehold(context.user.id, {
      name: 'New Household',
      description: 'For testing',
      defaultCurrencyId: 'USD',
      countryCode: 'US',
      timezone: 'UTC',
      budgetMonthStartsOn: 5,
      creditExpenseTiming: 'payment_month',
      creditInstallmentBudgetMode: 'full_amount',
    });

    expect(household.name).toBe('New Household');
    expect(household.defaultCurrencyId).toBe('USD');
    expect(household.timezone).toBe('UTC');

    const membership = await householdsRepository.findMembership(household.id, context.user.id);
    expect(membership?.role).toBe('owner');
  });

  it('updateMemberRole does not allow demoting the last owner', async () => {
    const context = await createAuthenticatedContext();

    await expect(
      householdsService.updateMemberRole(
        context.householdContext,
        context.household.id,
        context.user.id,
        {
          role: 'admin',
        },
      ),
    ).rejects.toThrow(ValidationError);
  });

  it('createInvite and acceptInvite add the invited user as a member', async () => {
    const owner = await createAuthenticatedContext();
    const invitedUser = await createUser({ email: 'invited-household@example.com' });

    const invite = await householdsService.createInvite(
      owner.householdContext,
      owner.household.id,
      {
        email: invitedUser.email,
        role: 'member',
      },
    );

    expect(invite.email).toBe(invitedUser.email);
    expect(invite.status).toBe('pending');

    const link = await householdsService.refreshInviteLink(
      owner.householdContext,
      owner.household.id,
      invite.id,
    );
    const token = new URL(link.url).pathname.split('/').at(-1);
    if (!token) throw new Error('Invitation URL does not contain a token');
    await householdsService.acceptInvite(invitedUser.id, invitedUser.email, token);

    const membership = await householdsRepository.findMembership(
      owner.household.id,
      invitedUser.id,
    );
    expect(membership?.role).toBe('member');

    const pendingInvites = await householdsService.listMyPendingInvites(
      invitedUser.email,
      ListMyHouseholdInvitesRequestQuerySchema.parse({}),
    );
    expect(pendingInvites.data).toHaveLength(0);
  });
});

describe('households DB list filters', () => {
  it('applies household, member, household-invite, and personal-invite filters in SQL', async () => {
    const context = await createAuthenticatedContext();
    const invitedUser = await createUser({ email: 'query-filter-invite@example.com' });
    const invite = await householdsService.createInvite(
      context.householdContext,
      context.household.id,
      {
        email: invitedUser.email,
        role: 'member',
      },
    );

    const households = await householdsService.listHouseholds(
      context.user.id,
      ListHouseholdsRequestQuerySchema.parse({
        search: context.household.name,
        roles: 'owner,member',
        countryCodes: context.household.countryCode,
        defaultCurrencyCodes: context.household.defaultCurrencyId,
        timezones: context.household.timezone,
        budgetMonthStartsOnMin: context.household.budgetMonthStartsOn,
        budgetMonthStartsOnMax: context.household.budgetMonthStartsOn,
        creditExpenseTimings: context.household.creditExpenseTiming,
        creditInstallmentBudgetModes: context.household.creditInstallmentBudgetMode,
        createdAtFrom: '2020-01-01',
        createdAtTo: '2030-01-01',
        updatedAtFrom: '2020-01-01',
        updatedAtTo: '2030-01-01',
        sort: 'name',
        perPage: 1,
      }),
    );
    expect(households.data).toEqual([
      expect.objectContaining({ id: context.household.id, role: 'owner' }),
    ]);

    const members = await householdsService.listMembers(
      context.householdContext,
      context.household.id,
      ListHouseholdMembersRequestQuerySchema.parse({
        search: context.user.email,
        roles: 'owner',
        createdAtFrom: '2020-01-01',
        createdAtTo: '2030-01-01',
        updatedAtFrom: '2020-01-01',
        updatedAtTo: '2030-01-01',
      }),
    );
    expect(members.data).toEqual([expect.objectContaining({ userId: context.user.id })]);

    const invites = await householdsService.listHouseholdInvites(
      context.householdContext,
      context.household.id,
      ListHouseholdInvitesRequestQuerySchema.parse({
        search: invitedUser.email,
        roles: 'member',
        statuses: 'pending',
        createdAtFrom: '2020-01-01',
        createdAtTo: '2030-01-01',
        updatedAtFrom: '2020-01-01',
        updatedAtTo: '2030-01-01',
      }),
    );
    expect(invites.data).toEqual([expect.objectContaining({ id: invite.id })]);

    const personal = await householdsService.listMyPendingInvites(
      invitedUser.email,
      ListMyHouseholdInvitesRequestQuerySchema.parse({
        householdIds: context.household.id,
        roles: 'member',
        statuses: 'pending',
      }),
    );
    expect(personal.data).toEqual([expect.objectContaining({ id: invite.id })]);
  });
});
