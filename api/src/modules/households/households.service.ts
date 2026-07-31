import type { HouseholdContext } from '@/config/permissions';
import { db } from '@/db';
import { budgetsRepository } from '@/modules/budgets/budgets.repository';
import { currenciesRepository } from '@/modules/currencies/currencies.repository';
import { fxService } from '@/modules/fx/fx.service';
import { ForbiddenError, NotFoundError, ValidationError } from '@/shared/errors';
import { formatISODateTime } from '@/shared/lib/date';
import { createListMeta, type ListResult } from '@/shared/list';
import type {
  ListHouseholdInvitesRequestQuery,
  ListHouseholdMembersRequestQuery,
  ListHouseholdsRequestQuery,
  ListMyHouseholdInvitesRequestQuery,
} from './households.query';
import { householdsRepository } from './households.repository';
import type {
  CreateHouseholdInviteRequestBody,
  CreateHouseholdRequestBody,
  Household,
  HouseholdInvite,
  HouseholdMember,
  UpdateHouseholdMemberRequestBody,
  UpdateHouseholdRequestBody,
} from './households.types';

type DefaultHouseholdOptions = {
  name?: string;
  description?: string;
  defaultCurrencyId?: CreateHouseholdRequestBody['defaultCurrencyId'];
  countryCode?: CreateHouseholdRequestBody['countryCode'];
  timezone?: CreateHouseholdRequestBody['timezone'];
  budgetMonthStartsOn?: CreateHouseholdRequestBody['budgetMonthStartsOn'];
  creditExpenseTiming?: CreateHouseholdRequestBody['creditExpenseTiming'];
  creditInstallmentBudgetMode?: CreateHouseholdRequestBody['creditInstallmentBudgetMode'];
};

function assertCurrentHousehold(context: HouseholdContext, householdId: string): void {
  if (context.householdId !== householdId) {
    throw new ForbiddenError('Active household does not match route household');
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function canManageRole(
  actorRole: HouseholdContext['role'],
  targetRole: HouseholdContext['role'],
): boolean {
  if (actorRole === 'owner') {
    return true;
  }

  return targetRole !== 'owner';
}

function mapHousehold(
  record: Awaited<ReturnType<typeof householdsRepository.listHouseholdsForUser>>[number],
): Household {
  return {
    id: record.id,
    name: record.name,
    description: record.description ?? null,
    defaultCurrencyId: record.defaultCurrencyId,
    countryCode: record.countryCode,
    timezone: record.timezone,
    budgetMonthStartsOn: record.budgetMonthStartsOn,
    creditExpenseTiming: record.creditExpenseTiming,
    creditInstallmentBudgetMode: record.creditInstallmentBudgetMode,
    role: record.role,
    createdByUserId: record.createdByUserId,
    createdAt: formatISODateTime(record.createdAt),
    updatedAt: formatISODateTime(record.updatedAt),
  };
}

function mapHouseholdMember(
  record: Awaited<ReturnType<typeof householdsRepository.listMembers>>[number],
): HouseholdMember {
  return {
    householdId: record.householdId,
    userId: record.userId,
    name: record.name,
    email: record.email,
    role: record.role,
    createdAt: formatISODateTime(record.createdAt),
    updatedAt: formatISODateTime(record.updatedAt),
  };
}

function mapHouseholdInvite(
  record:
    | Awaited<ReturnType<typeof householdsRepository.listInvitesForHousehold>>[number]
    | Awaited<ReturnType<typeof householdsRepository.listPendingInvitesForEmail>>[number],
): HouseholdInvite {
  return {
    id: record.id,
    householdId: record.householdId,
    householdName: record.householdName,
    email: record.email,
    role: record.role,
    status: record.status,
    invitedByUserId: record.invitedByUserId,
    createdAt: formatISODateTime(record.createdAt),
    updatedAt: formatISODateTime(record.updatedAt),
    acceptedAt: record.acceptedAt ? formatISODateTime(record.acceptedAt) : null,
    revokedAt: record.revokedAt ? formatISODateTime(record.revokedAt) : null,
  };
}

export async function createDefaultHouseholdForUser(
  userId: string,
  options: DefaultHouseholdOptions = {},
): Promise<string> {
  const user = await householdsRepository.findUserDefaults(userId);
  if (!user) throw new NotFoundError('User');

  if (user.defaultHouseholdId) {
    const defaultMembership = await householdsRepository.findMembership(
      user.defaultHouseholdId,
      userId,
    );
    if (defaultMembership) {
      return user.defaultHouseholdId;
    }
  }

  const existingHouseholds = await householdsRepository.listHouseholdsForUser(userId);
  const existingHousehold = existingHouseholds[0];
  if (existingHousehold) {
    await householdsRepository.setDefaultHouseholdForUser(userId, existingHousehold.id);
    return existingHousehold.id;
  }

  return db.transaction(async (tx) => {
    const household = await householdsRepository.createHousehold(tx, userId, {
      name: options.name ?? `${user.name}'s Household`,
      description: options.description,
      defaultCurrencyId: options.defaultCurrencyId ?? user.preferredCurrency,
      countryCode: options.countryCode ?? 'BR',
      timezone: options.timezone ?? user.preferredTimezone,
      budgetMonthStartsOn: options.budgetMonthStartsOn ?? 1,
      creditExpenseTiming: options.creditExpenseTiming ?? 'spend_month',
      creditInstallmentBudgetMode: options.creditInstallmentBudgetMode ?? 'per_installment',
    });

    await householdsRepository.createMembership(tx, household.id, userId, 'owner');
    await householdsRepository.setDefaultHousehold(tx, userId, household.id);

    return household.id;
  });
}

export async function acceptPendingInvitesForUser(userId: string, email: string): Promise<void> {
  const pendingInvites = await householdsRepository.listPendingInvitesForEmail(
    normalizeEmail(email),
  );
  if (pendingInvites.length === 0) {
    return;
  }

  await db.transaction(async (tx) => {
    for (const invite of pendingInvites) {
      await householdsRepository.createMembership(tx, invite.householdId, userId, invite.role);
      await householdsRepository.acceptInvite(tx, invite.id);
    }
  });
}

export async function listHouseholds(
  userId: string,
  query: ListHouseholdsRequestQuery,
): Promise<ListResult<Household>> {
  await createDefaultHouseholdForUser(userId);
  const page = await householdsRepository.listHouseholdsForUserPage(userId, query);

  return {
    data: page.rows.map(mapHousehold),
    meta: createListMeta(query, page.totalCount),
  };
}

export async function createHousehold(
  userId: string,
  body: CreateHouseholdRequestBody,
): Promise<Household> {
  const currency = await currenciesRepository.findByCode(body.defaultCurrencyId);
  if (!currency) throw new NotFoundError('Currency');

  const householdId = await db.transaction(async (tx) => {
    const household = await householdsRepository.createHousehold(tx, userId, body);
    await householdsRepository.createMembership(tx, household.id, userId, 'owner');
    return household.id;
  });

  const household = (await householdsRepository.listHouseholdsForUser(userId)).find(
    (item) => item.id === householdId,
  );
  if (!household) throw new NotFoundError('Household');

  return mapHousehold(household);
}

export async function updateHousehold(
  context: HouseholdContext,
  householdId: string,
  body: UpdateHouseholdRequestBody,
): Promise<Household> {
  assertCurrentHousehold(context, householdId);

  const currentHousehold = await householdsRepository.findHouseholdById(householdId);
  if (!currentHousehold) throw new NotFoundError('Household');

  if (body.defaultCurrencyId) {
    const currency = await currenciesRepository.findByCode(body.defaultCurrencyId);
    if (!currency) throw new NotFoundError('Currency');
  }

  if (body.defaultCurrencyId && body.defaultCurrencyId !== currentHousehold.defaultCurrencyId) {
    const budgets = await budgetsRepository.listBudgetsForHousehold(householdId);
    const convertedAmountsByBudgetId = new Map<string, number>();

    for (const budget of budgets) {
      const convertedAmount = await fxService.convertAmount({
        amount: budget.amount,
        fromCurrencyCode: currentHousehold.defaultCurrencyId,
        toCurrencyCode: body.defaultCurrencyId,
        date: budget.month,
      });

      convertedAmountsByBudgetId.set(budget.id, convertedAmount);
    }

    await db.transaction(async (tx) => {
      for (const budget of budgets) {
        const convertedAmount = convertedAmountsByBudgetId.get(budget.id);
        if (convertedAmount === undefined) {
          continue;
        }

        await budgetsRepository.updateBudgetAmount(tx, budget.id, convertedAmount);
      }

      const updated = await householdsRepository.updateHouseholdInTransaction(
        tx,
        householdId,
        body,
      );
      if (!updated) throw new NotFoundError('Household');
    });
  } else {
    const updated = await householdsRepository.updateHousehold(householdId, body);
    if (!updated) throw new NotFoundError('Household');
  }

  const household = (await householdsRepository.listHouseholdsForUser(context.userId)).find(
    (item) => item.id === householdId,
  );
  if (!household) throw new NotFoundError('Household');

  return mapHousehold(household);
}

export async function listMembers(
  context: HouseholdContext,
  householdId: string,
  query: ListHouseholdMembersRequestQuery,
): Promise<ListResult<HouseholdMember>> {
  assertCurrentHousehold(context, householdId);
  const page = await householdsRepository.listMembersPage(householdId, query);

  return {
    data: page.rows.map(mapHouseholdMember),
    meta: createListMeta(query, page.totalCount),
  };
}

export async function updateMemberRole(
  context: HouseholdContext,
  householdId: string,
  userId: string,
  body: UpdateHouseholdMemberRequestBody,
): Promise<HouseholdMember> {
  assertCurrentHousehold(context, householdId);

  const targetMembership = await householdsRepository.findMembership(householdId, userId);
  if (!targetMembership) throw new NotFoundError('Household member');

  if (
    !canManageRole(context.role, targetMembership.role) ||
    !canManageRole(context.role, body.role)
  ) {
    throw new ForbiddenError('You do not have permission to manage this member role');
  }

  if (targetMembership.role === 'owner' && body.role !== 'owner') {
    const ownerCount = await householdsRepository.countOwners(householdId);
    if (ownerCount <= 1) {
      throw new ValidationError('A household must have at least one owner');
    }
  }

  const updated = await householdsRepository.updateMemberRole(householdId, userId, body.role);
  if (!updated) throw new NotFoundError('Household member');

  const member = (await householdsRepository.listMembers(householdId)).find(
    (item) => item.userId === userId,
  );
  if (!member) throw new NotFoundError('Household member');

  return mapHouseholdMember(member);
}

export async function removeMember(
  context: HouseholdContext,
  householdId: string,
  userId: string,
): Promise<void> {
  assertCurrentHousehold(context, householdId);

  const targetMembership = await householdsRepository.findMembership(householdId, userId);
  if (!targetMembership) throw new NotFoundError('Household member');

  if (!canManageRole(context.role, targetMembership.role)) {
    throw new ForbiddenError('You do not have permission to remove this member');
  }

  if (targetMembership.role === 'owner') {
    const ownerCount = await householdsRepository.countOwners(householdId);
    if (ownerCount <= 1) {
      throw new ValidationError('A household must have at least one owner');
    }
  }

  await householdsRepository.removeMember(householdId, userId);
}

export async function createInvite(
  context: HouseholdContext,
  householdId: string,
  body: CreateHouseholdInviteRequestBody,
): Promise<HouseholdInvite> {
  assertCurrentHousehold(context, householdId);

  if (!canManageRole(context.role, body.role)) {
    throw new ForbiddenError('You do not have permission to invite users with this role');
  }

  const invite = await householdsRepository.createInvite(householdId, context.userId, {
    ...body,
    email: normalizeEmail(body.email),
  });

  const created = (await householdsRepository.listInvitesForHousehold(householdId)).find(
    (item) => item.id === invite.id,
  );
  if (!created) throw new NotFoundError('Household invite');

  return mapHouseholdInvite(created);
}

export async function listHouseholdInvites(
  context: HouseholdContext,
  householdId: string,
  query: ListHouseholdInvitesRequestQuery,
): Promise<ListResult<HouseholdInvite>> {
  assertCurrentHousehold(context, householdId);
  const page = await householdsRepository.listInvitesForHouseholdPage(householdId, query);

  return {
    data: page.rows.map(mapHouseholdInvite),
    meta: createListMeta(query, page.totalCount),
  };
}

export async function listMyPendingInvites(
  userEmail: string,
  query: ListMyHouseholdInvitesRequestQuery,
): Promise<ListResult<HouseholdInvite>> {
  const page = await householdsRepository.listPendingInvitesForEmailPage(
    normalizeEmail(userEmail),
    query,
  );

  return {
    data: page.rows.map(mapHouseholdInvite),
    meta: createListMeta(query, page.totalCount),
  };
}

export async function acceptInvite(
  userId: string,
  userEmail: string,
  inviteId: string,
): Promise<void> {
  const invite = await householdsRepository.findPendingInviteById(inviteId);
  if (!invite || invite.email !== normalizeEmail(userEmail)) {
    throw new NotFoundError('Household invite');
  }

  await db.transaction(async (tx) => {
    await householdsRepository.createMembership(tx, invite.householdId, userId, invite.role);
    await householdsRepository.acceptInvite(tx, invite.id);
  });
}

export async function revokeInvite(
  context: HouseholdContext,
  householdId: string,
  inviteId: string,
): Promise<void> {
  assertCurrentHousehold(context, householdId);
  const invite = await householdsRepository.revokeInvite(householdId, inviteId);
  if (!invite) throw new NotFoundError('Household invite');
}
