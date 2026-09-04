import type {
  AcceptHouseholdInviteResult,
  Household,
  HouseholdInvite,
  HouseholdInviteLink,
  HouseholdInvitePreview,
  HouseholdMember,
} from '@luraba/contracts/households';
import {
  type createHouseholdBodySchema,
  type createHouseholdInviteBodySchema,
  householdInviteComputedStatusSchema,
  type updateHouseholdBodySchema,
  type updateHouseholdMemberBodySchema,
} from '@luraba/contracts/households';
import type { z } from 'zod';
import { env } from '@/config/env';
import type { HouseholdContext } from '@/config/permissions';
import { db } from '@/db';
import { budgetsRepository } from '@/modules/budgets/budgets.repository';
import { currenciesRepository } from '@/modules/currencies/currencies.repository';
import { fxService } from '@/modules/fx/fx.service';
import { mailService } from '@/modules/mail/mail.service';
import { renderHouseholdInvitation } from '@/modules/mail/mail.templates';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '@/shared/errors';
import { formatISODateTime } from '@/shared/lib/date';
import { createListMeta, type ListResult } from '@/shared/list';
import { logger } from '@/shared/logger';
import {
  createHouseholdInvitationToken,
  hashHouseholdInvitationToken,
} from './household-invitation-token';
import type {
  ListHouseholdInvitesQuery,
  ListHouseholdMembersQuery,
  ListHouseholdsQuery,
  ListMyHouseholdInvitesQuery,
} from './households.query';
import { type HouseholdInviteListRow, householdsRepository } from './households.repository';

type CreateHouseholdValues = z.output<typeof createHouseholdBodySchema>;
type UpdateHouseholdValues = z.output<typeof updateHouseholdBodySchema>;
type UpdateHouseholdMemberValues = z.output<typeof updateHouseholdMemberBodySchema>;
type CreateHouseholdInviteValues = z.output<typeof createHouseholdInviteBodySchema>;
const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function canManageRole(
  actorRole: HouseholdContext['role'],
  targetRole: HouseholdContext['role'],
): boolean {
  return actorRole === 'owner' || targetRole !== 'owner';
}

function inviteExpiresAt(): Date {
  return new Date(Date.now() + INVITATION_LIFETIME_MS);
}

function invitationUrl(token: string): string {
  return `${env.frontendOrigin.replace(/\/+$/, '')}/invite/${token}`;
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
    id: record.id,
    householdId: record.householdId,
    userId: record.userId,
    name: record.name,
    email: record.email,
    image: record.image,
    emailVerified: record.emailVerified,
    role: record.role,
    lastActiveAt: record.lastActiveAt ? formatISODateTime(record.lastActiveAt) : null,
    createdAt: formatISODateTime(record.createdAt),
    updatedAt: formatISODateTime(record.updatedAt),
  };
}

function mapHouseholdInvite(record: HouseholdInviteListRow): HouseholdInvite {
  return {
    id: record.id,
    householdId: record.householdId,
    householdName: record.householdName,
    email: record.email,
    role: record.role,
    status: record.status,
    computedStatus: householdInviteComputedStatusSchema.parse(record.computedStatus),
    invitedByUserId: record.invitedByUserId,
    inviter:
      record.inviterId && record.inviterName && record.inviterEmail
        ? {
            id: record.inviterId,
            name: record.inviterName,
            email: record.inviterEmail,
            image: record.inviterImage,
          }
        : null,
    createdAt: formatISODateTime(record.createdAt),
    updatedAt: formatISODateTime(record.updatedAt),
    expiresAt: formatISODateTime(record.expiresAt),
    acceptedAt: record.acceptedAt ? formatISODateTime(record.acceptedAt) : null,
    rejectedAt: record.rejectedAt ? formatISODateTime(record.rejectedAt) : null,
    canceledAt: record.canceledAt ? formatISODateTime(record.canceledAt) : null,
  };
}

async function getMappedInvite(inviteId: string): Promise<HouseholdInvite> {
  const invite = await householdsRepository.findInviteListRowById(inviteId);
  if (!invite) throw new NotFoundError('Household invite');
  return mapHouseholdInvite(invite);
}

function issueInvitationToken() {
  const token = createHouseholdInvitationToken();
  return {
    token,
    tokenHash: hashHouseholdInvitationToken(token),
    expiresAt: inviteExpiresAt(),
  };
}

async function sendInvitationEmail(invite: HouseholdInviteListRow, token: string): Promise<void> {
  if (!mailService.isConfigured()) return;

  try {
    const message = renderHouseholdInvitation({
      householdName: invite.householdName,
      inviterName: invite.inviterName ?? undefined,
      inviteUrl: invitationUrl(token),
    });
    await mailService.send({ to: invite.email, ...message });
  } catch (error) {
    logger.warn({ err: error, invitationId: invite.id }, 'Household invitation email failed');
  }
}

function assertInviteRecipient(
  invite: Awaited<ReturnType<typeof householdsRepository.findInviteByTokenHash>>,
  email: string,
): asserts invite is NonNullable<typeof invite> {
  if (!invite) throw new NotFoundError('Household invite');
  if (invite.email !== normalizeEmail(email)) {
    throw new ForbiddenError('This invitation belongs to another email address');
  }
}

function assertActionableInvite(
  invite: NonNullable<Awaited<ReturnType<typeof householdsRepository.findInviteByTokenHash>>>,
): void {
  if (invite.status !== 'pending') {
    throw new ConflictError(`This invitation is already ${invite.status}`);
  }
  if (invite.expiresAt <= new Date()) {
    throw new ConflictError('This invitation has expired');
  }
}

export async function resolveHouseholdIdForUser(userId: string): Promise<string | null> {
  const user = await householdsRepository.findUserDefaults(userId);
  if (!user) return null;

  if (user.defaultHouseholdId) {
    const membership = await householdsRepository.findMembership(user.defaultHouseholdId, userId);
    if (membership) return user.defaultHouseholdId;
  }

  return (await householdsRepository.listHouseholdsForUser(userId))[0]?.id ?? null;
}

export async function createDefaultHouseholdForUser(userId: string): Promise<string> {
  const existing = await resolveHouseholdIdForUser(userId);
  if (existing) return existing;

  const user = await householdsRepository.findUserDefaults(userId);
  if (!user) throw new NotFoundError('User');

  return db.transaction(async (tx) => {
    const household = await householdsRepository.createHousehold(tx, userId, {
      name: `${user.name}'s Household`,
      description: 'Personal household created during onboarding.',
      defaultCurrencyId: user.preferredCurrency,
      countryCode: 'BR',
      timezone: user.preferredTimezone,
      budgetMonthStartsOn: 1,
      creditExpenseTiming: 'spend_month',
      creditInstallmentBudgetMode: 'per_installment',
    });
    await householdsRepository.createMembership(tx, household.id, userId, 'owner');
    await householdsRepository.setDefaultHousehold(tx, userId, household.id);
    return household.id;
  });
}

export async function provisionDefaultHouseholdForUser(
  userId: string,
  email: string,
): Promise<string | null> {
  const existing = await resolveHouseholdIdForUser(userId);
  if (existing) return existing;

  if (await householdsRepository.hasActionableInviteForEmail(normalizeEmail(email))) {
    return null;
  }

  return createDefaultHouseholdForUser(userId);
}

export async function listHouseholds(
  userId: string,
  query: ListHouseholdsQuery,
): Promise<ListResult<Household>> {
  const page = await householdsRepository.listHouseholdsForUserPage(userId, query);
  return { data: page.rows.map(mapHousehold), meta: createListMeta(query, page.totalCount) };
}

export async function getHousehold(
  context: HouseholdContext,
  householdId: string,
): Promise<Household> {
  const household = await householdsRepository.findHouseholdForUser(context.userId, householdId);
  if (!household) throw new NotFoundError('Household');
  return mapHousehold(household);
}

export async function deleteHousehold(
  context: HouseholdContext,
  householdId: string,
): Promise<void> {
  if (context.role !== 'owner') {
    throw new ForbiddenError('Only a household owner can delete the household');
  }

  if (!(await householdsRepository.deleteHousehold(householdId))) {
    throw new NotFoundError('Household');
  }
}

export async function createHousehold(
  userId: string,
  body: CreateHouseholdValues,
): Promise<Household> {
  const currency = await currenciesRepository.findByCode(body.defaultCurrencyId);
  if (!currency) throw new NotFoundError('Currency');

  const user = await householdsRepository.findUserDefaults(userId);
  if (!user) throw new NotFoundError('User');

  const householdId = await db.transaction(async (tx) => {
    const household = await householdsRepository.createHousehold(tx, userId, body);
    await householdsRepository.createMembership(tx, household.id, userId, 'owner');
    if (!user.defaultHouseholdId) {
      await householdsRepository.setDefaultHousehold(tx, userId, household.id);
    }
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
  body: UpdateHouseholdValues,
): Promise<Household> {
  const current = await householdsRepository.findHouseholdById(householdId);
  if (!current) throw new NotFoundError('Household');

  if (body.defaultCurrencyId) {
    const currency = await currenciesRepository.findByCode(body.defaultCurrencyId);
    if (!currency) throw new NotFoundError('Currency');
  }

  if (body.defaultCurrencyId && body.defaultCurrencyId !== current.defaultCurrencyId) {
    const budgets = await budgetsRepository.listBudgetsForHousehold(householdId);
    const converted = new Map<string, number>();
    for (const budget of budgets) {
      converted.set(
        budget.id,
        await fxService.convertAmount({
          amount: budget.amount,
          fromCurrencyCode: current.defaultCurrencyId,
          toCurrencyCode: body.defaultCurrencyId,
          date: budget.month,
        }),
      );
    }

    await db.transaction(async (tx) => {
      for (const budget of budgets) {
        const amount = converted.get(budget.id);
        if (amount !== undefined) await budgetsRepository.updateBudgetAmount(tx, budget.id, amount);
      }
      const updated = await householdsRepository.updateHouseholdInTransaction(
        tx,
        householdId,
        body,
      );
      if (!updated) throw new NotFoundError('Household');
    });
  } else if (!(await householdsRepository.updateHousehold(householdId, body))) {
    throw new NotFoundError('Household');
  }

  const household = (await householdsRepository.listHouseholdsForUser(context.userId)).find(
    (item) => item.id === householdId,
  );
  if (!household) throw new NotFoundError('Household');
  return mapHousehold(household);
}

export async function listMembers(
  _context: HouseholdContext,
  householdId: string,
  query: ListHouseholdMembersQuery,
): Promise<ListResult<HouseholdMember>> {
  const page = await householdsRepository.listMembersPage(householdId, query);
  return { data: page.rows.map(mapHouseholdMember), meta: createListMeta(query, page.totalCount) };
}

export async function updateMemberRole(
  context: HouseholdContext,
  householdId: string,
  userId: string,
  body: UpdateHouseholdMemberValues,
): Promise<HouseholdMember> {
  const target = await householdsRepository.findMembership(householdId, userId);
  if (!target) throw new NotFoundError('Household member');
  if (!canManageRole(context.role, target.role) || !canManageRole(context.role, body.role)) {
    throw new ForbiddenError('You do not have permission to manage this member role');
  }
  if (target.role === 'owner' && body.role !== 'owner') {
    if ((await householdsRepository.countOwners(householdId)) <= 1) {
      throw new ValidationError('A household must have at least one owner');
    }
  }

  if (!(await householdsRepository.updateMemberRole(householdId, userId, body.role))) {
    throw new NotFoundError('Household member');
  }
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
  const target = await householdsRepository.findMembership(householdId, userId);
  if (!target) throw new NotFoundError('Household member');
  if (!canManageRole(context.role, target.role)) {
    throw new ForbiddenError('You do not have permission to remove this member');
  }
  if (target.role === 'owner' && (await householdsRepository.countOwners(householdId)) <= 1) {
    throw new ValidationError('A household must have at least one owner');
  }
  await householdsRepository.removeMember(householdId, userId);
}

export async function createInvite(
  context: HouseholdContext,
  householdId: string,
  body: CreateHouseholdInviteValues,
): Promise<HouseholdInvite> {
  if (!canManageRole(context.role, body.role)) {
    throw new ForbiddenError('You do not have permission to invite users with this role');
  }

  const email = normalizeEmail(body.email);
  if (await householdsRepository.findMembershipByEmail(householdId, email)) {
    throw new ConflictError('User is already a member of this household');
  }

  const token = issueInvitationToken();
  const pending = await householdsRepository.findPendingInviteByHouseholdAndEmail(
    householdId,
    email,
  );
  if (pending && pending.expiresAt > new Date()) {
    throw new ConflictError('An active invitation already exists for this email');
  }

  const created = pending
    ? await householdsRepository.refreshInvite(pending.id, {
        role: body.role,
        invitedByUserId: context.userId,
        tokenHash: token.tokenHash,
        expiresAt: token.expiresAt,
      })
    : await householdsRepository.createInvite({
        householdId,
        email,
        role: body.role,
        invitedByUserId: context.userId,
        tokenHash: token.tokenHash,
        expiresAt: token.expiresAt,
      });
  if (!created) throw new NotFoundError('Household invite');

  const invite = await householdsRepository.findInviteListRowById(created.id);
  if (!invite) throw new NotFoundError('Household invite');
  await sendInvitationEmail(invite, token.token);
  return mapHouseholdInvite(invite);
}

export async function listHouseholdInvites(
  _context: HouseholdContext,
  householdId: string,
  query: ListHouseholdInvitesQuery,
): Promise<ListResult<HouseholdInvite>> {
  const page = await householdsRepository.listInvitesForHouseholdPage(householdId, query);
  return { data: page.rows.map(mapHouseholdInvite), meta: createListMeta(query, page.totalCount) };
}

export async function listMyPendingInvites(
  userEmail: string,
  query: ListMyHouseholdInvitesQuery,
): Promise<ListResult<HouseholdInvite>> {
  const page = await householdsRepository.listPendingInvitesForEmailPage(
    normalizeEmail(userEmail),
    query,
  );
  return { data: page.rows.map(mapHouseholdInvite), meta: createListMeta(query, page.totalCount) };
}

export async function previewInvite(token: string): Promise<HouseholdInvitePreview> {
  const invite = await householdsRepository.findInvitePreviewByTokenHash(
    hashHouseholdInvitationToken(token),
  );
  if (!invite) throw new NotFoundError('Household invite');

  return {
    email: invite.email,
    household: { name: invite.householdName },
    role: invite.role,
    inviter: invite.inviterName ? { name: invite.inviterName, image: invite.inviterImage } : null,
    status: householdInviteComputedStatusSchema.parse(invite.computedStatus),
    expiresAt: formatISODateTime(invite.expiresAt),
  };
}

export async function acceptInvite(
  userId: string,
  userEmail: string,
  token: string,
): Promise<AcceptHouseholdInviteResult> {
  const invite = await householdsRepository.findInviteByTokenHash(
    hashHouseholdInvitationToken(token),
  );
  assertInviteRecipient(invite, userEmail);
  assertActionableInvite(invite);

  if (await householdsRepository.findMembershipByEmail(invite.householdId, invite.email)) {
    throw new ConflictError('User is already a member of this household');
  }

  await db.transaction(async (tx) => {
    const accepted = await householdsRepository.acceptInvite(tx, invite.id);
    if (!accepted) throw new ConflictError('This invitation is no longer available');
    await householdsRepository.createMembership(tx, invite.householdId, userId, invite.role);
    await householdsRepository.setDefaultHousehold(tx, userId, invite.householdId);
    await householdsRepository.verifyUserEmail(tx, userId);
  });

  const membership = await householdsRepository.findMembership(invite.householdId, userId);
  if (!membership) throw new NotFoundError('Household membership');

  return {
    household: {
      id: invite.householdId,
      name: membership.householdName,
      role: membership.role,
    },
  };
}

async function acceptInviteRecord(
  userId: string,
  userEmail: string,
  invite: Awaited<ReturnType<typeof householdsRepository.findInviteById>>,
): Promise<AcceptHouseholdInviteResult> {
  assertInviteRecipient(invite, userEmail);
  assertActionableInvite(invite);

  if (await householdsRepository.findMembershipByEmail(invite.householdId, invite.email)) {
    throw new ConflictError('User is already a member of this household');
  }

  await db.transaction(async (tx) => {
    const accepted = await householdsRepository.acceptInvite(tx, invite.id);
    if (!accepted) throw new ConflictError('This invitation is no longer available');
    await householdsRepository.createMembership(tx, invite.householdId, userId, invite.role);
    await householdsRepository.setDefaultHousehold(tx, userId, invite.householdId);
    await householdsRepository.verifyUserEmail(tx, userId);
  });

  const membership = await householdsRepository.findMembership(invite.householdId, userId);
  if (!membership) throw new NotFoundError('Household membership');

  return {
    household: {
      id: invite.householdId,
      name: membership.householdName,
      role: membership.role,
    },
  };
}

export async function acceptInviteById(
  userId: string,
  userEmail: string,
  inviteId: string,
): Promise<AcceptHouseholdInviteResult> {
  return acceptInviteRecord(userId, userEmail, await householdsRepository.findInviteById(inviteId));
}

export async function rejectInvite(userEmail: string, token: string): Promise<void> {
  const invite = await householdsRepository.findInviteByTokenHash(
    hashHouseholdInvitationToken(token),
  );
  assertInviteRecipient(invite, userEmail);
  assertActionableInvite(invite);
  if (!(await householdsRepository.rejectInvite(invite.id))) {
    throw new ConflictError('This invitation is no longer available');
  }
}

export async function rejectInviteById(userEmail: string, inviteId: string): Promise<void> {
  const invite = await householdsRepository.findInviteById(inviteId);
  assertInviteRecipient(invite, userEmail);
  assertActionableInvite(invite);
  if (!(await householdsRepository.rejectInvite(invite.id))) {
    throw new ConflictError('This invitation is no longer available');
  }
}

async function rotateManagedInvite(
  _context: HouseholdContext,
  householdId: string,
  inviteId: string,
) {
  const invite = await householdsRepository.findInviteById(inviteId);
  if (!invite || invite.householdId !== householdId || invite.status !== 'pending') {
    throw new NotFoundError('Household invite');
  }

  const token = issueInvitationToken();
  const refreshed = await householdsRepository.refreshInvite(inviteId, {
    tokenHash: token.tokenHash,
    expiresAt: token.expiresAt,
  });
  if (!refreshed) throw new NotFoundError('Household invite');
  return { invite: await getMappedInvite(inviteId), rawToken: token.token };
}

export async function refreshInviteLink(
  context: HouseholdContext,
  householdId: string,
  inviteId: string,
): Promise<HouseholdInviteLink> {
  const { invite, rawToken } = await rotateManagedInvite(context, householdId, inviteId);
  return { url: invitationUrl(rawToken), expiresAt: invite.expiresAt };
}

export async function resendInvite(
  context: HouseholdContext,
  householdId: string,
  inviteId: string,
): Promise<void> {
  const { rawToken } = await rotateManagedInvite(context, householdId, inviteId);
  const invite = await householdsRepository.findInviteListRowById(inviteId);
  if (!invite) throw new NotFoundError('Household invite');
  await sendInvitationEmail(invite, rawToken);
}

export async function cancelInvite(
  _context: HouseholdContext,
  householdId: string,
  inviteId: string,
): Promise<void> {
  if (!(await householdsRepository.cancelInvite(householdId, inviteId))) {
    throw new NotFoundError('Household invite');
  }
}
