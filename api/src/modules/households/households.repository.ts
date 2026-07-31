import { and, asc, eq, gt, type SQL, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  householdInvitesTable,
  householdMembersTable,
  householdsTable,
} from '@/db/schemas/households.schema';
import { usersTable } from '@/db/schemas/users.schema';
import type { TxClient } from '@/db/types';
import { now } from '@/shared/lib/date';
import { type DbListPage, getPagination } from '@/shared/list';
import type { Currency } from '@/shared/validation/preferences';
import { currencySchema } from '@/shared/validation/preferences';
import {
  buildHouseholdInvitesListOrder,
  buildHouseholdInvitesListWhere,
  buildHouseholdMembersListOrder,
  buildHouseholdMembersListWhere,
  buildHouseholdsListOrder,
  buildHouseholdsListWhere,
  buildMyHouseholdInvitesListWhere,
  householdInviteComputedStatusSql,
  householdInviteInviter,
  type ListHouseholdInvitesRequestQuery,
  type ListHouseholdMembersRequestQuery,
  type ListHouseholdsRequestQuery,
  type ListMyHouseholdInvitesRequestQuery,
} from './households.query';
import type {
  CreateHouseholdRequestBody,
  HouseholdInviteRecord,
  HouseholdMemberRecord,
  HouseholdRecord,
  UpdateHouseholdRequestBody,
} from './households.types';

export type HouseholdMembership = HouseholdMemberRecord & {
  householdName: HouseholdRecord['name'];
  defaultCurrencyId: Currency;
  countryCode: HouseholdRecord['countryCode'];
  timezone: HouseholdRecord['timezone'];
  budgetMonthStartsOn: HouseholdRecord['budgetMonthStartsOn'];
  creditExpenseTiming: HouseholdRecord['creditExpenseTiming'];
  creditInstallmentBudgetMode: HouseholdRecord['creditInstallmentBudgetMode'];
};

type HouseholdForUserRow = {
  id: string;
  name: string;
  description: string | null;
  defaultCurrencyId: Currency;
  countryCode: HouseholdRecord['countryCode'];
  timezone: HouseholdRecord['timezone'];
  budgetMonthStartsOn: HouseholdRecord['budgetMonthStartsOn'];
  creditExpenseTiming: HouseholdRecord['creditExpenseTiming'];
  creditInstallmentBudgetMode: HouseholdRecord['creditInstallmentBudgetMode'];
  role: HouseholdMemberRecord['role'];
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
};

type HouseholdMemberListRow = {
  id: string;
  householdId: string;
  userId: string;
  name: string;
  email: string;
  image: string | null;
  emailVerified: boolean;
  role: HouseholdMemberRecord['role'];
  lastActiveAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type HouseholdInviteListRow = {
  id: string;
  householdId: string;
  householdName: string;
  email: string;
  role: HouseholdInviteRecord['role'];
  status: HouseholdInviteRecord['status'];
  computedStatus: string;
  invitedByUserId: string;
  inviterId: string | null;
  inviterName: string | null;
  inviterEmail: string | null;
  inviterImage: string | null;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
  rejectedAt: Date | null;
  canceledAt: Date | null;
};

export type HouseholdInvitePreviewRow = {
  id: string;
  email: string;
  role: HouseholdInviteRecord['role'];
  status: HouseholdInviteRecord['status'];
  computedStatus: string;
  householdId: string;
  householdName: string;
  inviterName: string | null;
  inviterImage: string | null;
  expiresAt: Date;
};

const householdForUserSelect = {
  id: householdsTable.id,
  name: householdsTable.name,
  description: householdsTable.description,
  defaultCurrencyId: householdsTable.defaultCurrencyId,
  countryCode: householdsTable.countryCode,
  timezone: householdsTable.timezone,
  budgetMonthStartsOn: householdsTable.budgetMonthStartsOn,
  creditExpenseTiming: householdsTable.creditExpenseTiming,
  creditInstallmentBudgetMode: householdsTable.creditInstallmentBudgetMode,
  role: householdMembersTable.role,
  createdByUserId: householdsTable.createdByUserId,
  createdAt: householdsTable.createdAt,
  updatedAt: householdsTable.updatedAt,
} as const;

const householdMemberListSelect = {
  id: householdMembersTable.id,
  householdId: householdMembersTable.householdId,
  userId: usersTable.id,
  name: usersTable.name,
  email: usersTable.email,
  image: usersTable.image,
  emailVerified: usersTable.emailVerified,
  role: householdMembersTable.role,
  lastActiveAt: usersTable.lastActiveAt,
  createdAt: householdMembersTable.createdAt,
  updatedAt: householdMembersTable.updatedAt,
} as const;

const householdInviteListSelect = {
  id: householdInvitesTable.id,
  householdId: householdInvitesTable.householdId,
  householdName: householdsTable.name,
  email: householdInvitesTable.email,
  role: householdInvitesTable.role,
  status: householdInvitesTable.status,
  computedStatus: householdInviteComputedStatusSql,
  invitedByUserId: householdInvitesTable.invitedByUserId,
  inviterId: householdInviteInviter.id,
  inviterName: householdInviteInviter.name,
  inviterEmail: householdInviteInviter.email,
  inviterImage: householdInviteInviter.image,
  createdAt: householdInvitesTable.createdAt,
  updatedAt: householdInvitesTable.updatedAt,
  expiresAt: householdInvitesTable.expiresAt,
  acceptedAt: householdInvitesTable.acceptedAt,
  rejectedAt: householdInvitesTable.rejectedAt,
  canceledAt: householdInvitesTable.canceledAt,
} as const;

const householdInvitePreviewSelect = {
  id: householdInvitesTable.id,
  email: householdInvitesTable.email,
  role: householdInvitesTable.role,
  status: householdInvitesTable.status,
  computedStatus: householdInviteComputedStatusSql,
  householdId: householdInvitesTable.householdId,
  householdName: householdsTable.name,
  inviterName: householdInviteInviter.name,
  inviterImage: householdInviteInviter.image,
  expiresAt: householdInvitesTable.expiresAt,
} as const;

class HouseholdsRepository {
  async createHousehold(
    tx: TxClient,
    userId: string,
    values: CreateHouseholdRequestBody,
  ): Promise<HouseholdRecord> {
    const rows = await tx
      .insert(householdsTable)
      .values({
        name: values.name,
        description: values.description,
        defaultCurrencyId: values.defaultCurrencyId,
        countryCode: values.countryCode,
        timezone: values.timezone,
        budgetMonthStartsOn: values.budgetMonthStartsOn,
        creditExpenseTiming: values.creditExpenseTiming,
        creditInstallmentBudgetMode: values.creditInstallmentBudgetMode,
        createdByUserId: userId,
      })
      .returning();

    return rows[0];
  }

  async updateHousehold(
    householdId: string,
    values: UpdateHouseholdRequestBody,
  ): Promise<HouseholdRecord | undefined> {
    return this.updateHouseholdWithClient(db, householdId, values);
  }

  async updateHouseholdInTransaction(
    tx: TxClient,
    householdId: string,
    values: UpdateHouseholdRequestBody,
  ): Promise<HouseholdRecord | undefined> {
    return this.updateHouseholdWithClient(tx, householdId, values);
  }

  private async updateHouseholdWithClient(
    client: TxClient | typeof db,
    householdId: string,
    values: UpdateHouseholdRequestBody,
  ): Promise<HouseholdRecord | undefined> {
    const rows = await client
      .update(householdsTable)
      .set({ ...values, updatedAt: now() })
      .where(eq(householdsTable.id, householdId))
      .returning();

    const row = rows[0];
    if (!row) {
      return undefined;
    }

    return {
      ...row,
      defaultCurrencyId: currencySchema.parse(row.defaultCurrencyId),
    };
  }

  async findHouseholdById(householdId: string): Promise<HouseholdRecord | undefined> {
    const rows = await db
      .select()
      .from(householdsTable)
      .where(eq(householdsTable.id, householdId))
      .limit(1);
    return rows[0];
  }

  async createMembership(
    tx: TxClient,
    householdId: string,
    userId: string,
    role: HouseholdMemberRecord['role'],
  ): Promise<HouseholdMemberRecord> {
    const rows = await tx
      .insert(householdMembersTable)
      .values({ householdId, userId, role })
      .onConflictDoUpdate({
        target: [householdMembersTable.householdId, householdMembersTable.userId],
        set: { role, updatedAt: now() },
      })
      .returning();

    return rows[0];
  }

  async setDefaultHousehold(tx: TxClient, userId: string, householdId: string): Promise<void> {
    await tx
      .update(usersTable)
      .set({ defaultHouseholdId: householdId, updatedAt: now() })
      .where(eq(usersTable.id, userId));
  }

  async setDefaultHouseholdForUser(userId: string, householdId: string): Promise<void> {
    await db
      .update(usersTable)
      .set({ defaultHouseholdId: householdId, updatedAt: now() })
      .where(eq(usersTable.id, userId));
  }

  async findUserDefaults(userId: string): Promise<
    | {
        id: string;
        email: string;
        name: string;
        preferredCurrency: Currency;
        preferredTimezone: 'America/Sao_Paulo' | 'UTC';
        defaultHouseholdId: string | null;
      }
    | undefined
  > {
    const rows = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        name: usersTable.name,
        preferredCurrency: usersTable.preferredCurrency,
        preferredTimezone: usersTable.preferredTimezone,
        defaultHouseholdId: usersTable.defaultHouseholdId,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    return rows[0];
  }

  async findMembership(
    householdId: string,
    userId: string,
  ): Promise<HouseholdMembership | undefined> {
    const rows = await db
      .select({
        id: householdMembersTable.id,
        householdId: householdMembersTable.householdId,
        userId: householdMembersTable.userId,
        role: householdMembersTable.role,
        createdAt: householdMembersTable.createdAt,
        updatedAt: householdMembersTable.updatedAt,
        householdName: householdsTable.name,
        defaultCurrencyId: householdsTable.defaultCurrencyId,
        countryCode: householdsTable.countryCode,
        timezone: householdsTable.timezone,
        budgetMonthStartsOn: householdsTable.budgetMonthStartsOn,
        creditExpenseTiming: householdsTable.creditExpenseTiming,
        creditInstallmentBudgetMode: householdsTable.creditInstallmentBudgetMode,
      })
      .from(householdMembersTable)
      .innerJoin(householdsTable, eq(householdsTable.id, householdMembersTable.householdId))
      .where(
        and(
          eq(householdMembersTable.householdId, householdId),
          eq(householdMembersTable.userId, userId),
        ),
      );

    const row = rows[0];
    if (!row) {
      return undefined;
    }

    return {
      ...row,
      defaultCurrencyId: currencySchema.parse(row.defaultCurrencyId),
    };
  }

  async findMembershipByEmail(
    householdId: string,
    email: string,
  ): Promise<HouseholdMemberRecord | undefined> {
    const rows = await db
      .select({
        id: householdMembersTable.id,
        householdId: householdMembersTable.householdId,
        userId: householdMembersTable.userId,
        role: householdMembersTable.role,
        createdAt: householdMembersTable.createdAt,
        updatedAt: householdMembersTable.updatedAt,
      })
      .from(householdMembersTable)
      .innerJoin(usersTable, eq(usersTable.id, householdMembersTable.userId))
      .where(and(eq(householdMembersTable.householdId, householdId), eq(usersTable.email, email)))
      .limit(1);

    return rows[0];
  }

  async listHouseholdsForUser(userId: string) {
    return db
      .select(householdForUserSelect)
      .from(householdMembersTable)
      .innerJoin(householdsTable, eq(householdsTable.id, householdMembersTable.householdId))
      .where(eq(householdMembersTable.userId, userId))
      .orderBy(asc(householdsTable.name));
  }

  async listHouseholdsForUserPage(
    userId: string,
    query: ListHouseholdsRequestQuery,
  ): Promise<DbListPage<HouseholdForUserRow>> {
    const { limit, offset } = getPagination(query);
    const whereCondition = buildHouseholdsListWhere(userId, query);
    const orderBy = buildHouseholdsListOrder(query);

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::integer` })
      .from(householdMembersTable)
      .innerJoin(householdsTable, eq(householdsTable.id, householdMembersTable.householdId))
      .where(whereCondition);

    const rows = await db
      .select(householdForUserSelect)
      .from(householdMembersTable)
      .innerJoin(householdsTable, eq(householdsTable.id, householdMembersTable.householdId))
      .where(whereCondition)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset);

    return {
      rows: rows.map((row) => ({
        ...row,
        defaultCurrencyId: currencySchema.parse(row.defaultCurrencyId),
      })),
      totalCount: countRow?.count ?? 0,
    };
  }

  async listMembers(householdId: string) {
    return db
      .select(householdMemberListSelect)
      .from(householdMembersTable)
      .innerJoin(usersTable, eq(usersTable.id, householdMembersTable.userId))
      .where(eq(householdMembersTable.householdId, householdId))
      .orderBy(asc(usersTable.name));
  }

  async listMembersPage(
    householdId: string,
    query: ListHouseholdMembersRequestQuery,
  ): Promise<DbListPage<HouseholdMemberListRow>> {
    const { limit, offset } = getPagination(query);
    const whereCondition = buildHouseholdMembersListWhere(householdId, query);
    const orderBy = buildHouseholdMembersListOrder(query);

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::integer` })
      .from(householdMembersTable)
      .innerJoin(usersTable, eq(usersTable.id, householdMembersTable.userId))
      .where(whereCondition);

    const rows = await db
      .select(householdMemberListSelect)
      .from(householdMembersTable)
      .innerJoin(usersTable, eq(usersTable.id, householdMembersTable.userId))
      .where(whereCondition)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset);

    return {
      rows,
      totalCount: countRow?.count ?? 0,
    };
  }

  async countOwners(householdId: string): Promise<number> {
    const rows = await db
      .select({ count: sql<number>`count(*)::integer` })
      .from(householdMembersTable)
      .where(
        and(
          eq(householdMembersTable.householdId, householdId),
          eq(householdMembersTable.role, 'owner'),
        ),
      );

    return rows[0]?.count ?? 0;
  }

  async updateMemberRole(
    householdId: string,
    userId: string,
    role: HouseholdMemberRecord['role'],
  ): Promise<HouseholdMemberRecord | undefined> {
    const rows = await db
      .update(householdMembersTable)
      .set({ role, updatedAt: now() })
      .where(
        and(
          eq(householdMembersTable.householdId, householdId),
          eq(householdMembersTable.userId, userId),
        ),
      )
      .returning();

    return rows[0];
  }

  async removeMember(
    householdId: string,
    userId: string,
  ): Promise<HouseholdMemberRecord | undefined> {
    const rows = await db
      .delete(householdMembersTable)
      .where(
        and(
          eq(householdMembersTable.householdId, householdId),
          eq(householdMembersTable.userId, userId),
        ),
      )
      .returning();

    return rows[0];
  }

  async createInvite(values: {
    householdId: string;
    email: string;
    role: HouseholdInviteRecord['role'];
    invitedByUserId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<HouseholdInviteRecord> {
    const rows = await db.insert(householdInvitesTable).values(values).returning();
    return rows[0];
  }

  async refreshInvite(
    inviteId: string,
    values: {
      role?: HouseholdInviteRecord['role'];
      invitedByUserId?: string;
      tokenHash: string;
      expiresAt: Date;
    },
  ): Promise<HouseholdInviteRecord | undefined> {
    const rows = await db
      .update(householdInvitesTable)
      .set({
        ...values,
        acceptedAt: null,
        rejectedAt: null,
        canceledAt: null,
        status: 'pending',
        updatedAt: now(),
      })
      .where(eq(householdInvitesTable.id, inviteId))
      .returning();

    return rows[0];
  }

  private async listInvitePage(
    whereCondition: SQL,
    query: ListHouseholdInvitesRequestQuery | ListMyHouseholdInvitesRequestQuery,
    orderBy: SQL[],
  ): Promise<DbListPage<HouseholdInviteListRow>> {
    const { limit, offset } = getPagination(query);

    const [countRow, rows] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::integer` })
        .from(householdInvitesTable)
        .innerJoin(householdsTable, eq(householdsTable.id, householdInvitesTable.householdId))
        .leftJoin(
          householdInviteInviter,
          eq(householdInviteInviter.id, householdInvitesTable.invitedByUserId),
        )
        .where(whereCondition),
      db
        .select(householdInviteListSelect)
        .from(householdInvitesTable)
        .innerJoin(householdsTable, eq(householdsTable.id, householdInvitesTable.householdId))
        .leftJoin(
          householdInviteInviter,
          eq(householdInviteInviter.id, householdInvitesTable.invitedByUserId),
        )
        .where(whereCondition)
        .orderBy(...orderBy)
        .limit(limit)
        .offset(offset),
    ]);

    return {
      rows,
      totalCount: countRow[0]?.count ?? 0,
    };
  }

  async listInvitesForHousehold(householdId: string) {
    return db
      .select(householdInviteListSelect)
      .from(householdInvitesTable)
      .innerJoin(householdsTable, eq(householdsTable.id, householdInvitesTable.householdId))
      .leftJoin(
        householdInviteInviter,
        eq(householdInviteInviter.id, householdInvitesTable.invitedByUserId),
      )
      .where(eq(householdInvitesTable.householdId, householdId))
      .orderBy(asc(householdInvitesTable.email));
  }

  async listInvitesForHouseholdPage(
    householdId: string,
    query: ListHouseholdInvitesRequestQuery,
  ): Promise<DbListPage<HouseholdInviteListRow>> {
    return this.listInvitePage(
      buildHouseholdInvitesListWhere(householdId, query),
      query,
      buildHouseholdInvitesListOrder(query),
    );
  }

  async listPendingInvitesForEmailPage(
    email: string,
    query: ListMyHouseholdInvitesRequestQuery,
  ): Promise<DbListPage<HouseholdInviteListRow>> {
    return this.listInvitePage(
      buildMyHouseholdInvitesListWhere(email, query),
      query,
      buildHouseholdInvitesListOrder(query, true),
    );
  }

  async findInviteById(inviteId: string): Promise<HouseholdInviteRecord | undefined> {
    const rows = await db
      .select()
      .from(householdInvitesTable)
      .where(eq(householdInvitesTable.id, inviteId))
      .limit(1);

    return rows[0];
  }

  async findInvitePreviewByTokenHash(
    tokenHash: string,
  ): Promise<HouseholdInvitePreviewRow | undefined> {
    const rows = await db
      .select(householdInvitePreviewSelect)
      .from(householdInvitesTable)
      .innerJoin(householdsTable, eq(householdsTable.id, householdInvitesTable.householdId))
      .leftJoin(
        householdInviteInviter,
        eq(householdInviteInviter.id, householdInvitesTable.invitedByUserId),
      )
      .where(eq(householdInvitesTable.tokenHash, tokenHash))
      .limit(1);

    return rows[0];
  }

  async findInviteListRowById(inviteId: string): Promise<HouseholdInviteListRow | undefined> {
    const rows = await db
      .select(householdInviteListSelect)
      .from(householdInvitesTable)
      .innerJoin(householdsTable, eq(householdsTable.id, householdInvitesTable.householdId))
      .leftJoin(
        householdInviteInviter,
        eq(householdInviteInviter.id, householdInvitesTable.invitedByUserId),
      )
      .where(eq(householdInvitesTable.id, inviteId))
      .limit(1);

    return rows[0];
  }

  async findPendingInviteByHouseholdAndEmail(
    householdId: string,
    email: string,
  ): Promise<HouseholdInviteRecord | undefined> {
    const rows = await db
      .select()
      .from(householdInvitesTable)
      .where(
        and(
          eq(householdInvitesTable.householdId, householdId),
          eq(householdInvitesTable.email, email),
          eq(householdInvitesTable.status, 'pending'),
        ),
      )
      .limit(1);

    return rows[0];
  }

  async hasActionableInviteForEmail(email: string): Promise<boolean> {
    const rows = await db
      .select({ id: householdInvitesTable.id })
      .from(householdInvitesTable)
      .where(
        and(
          eq(householdInvitesTable.email, email),
          eq(householdInvitesTable.status, 'pending'),
          gt(householdInvitesTable.expiresAt, now()),
        ),
      )
      .limit(1);

    return rows.length > 0;
  }

  async findInviteByTokenHash(tokenHash: string): Promise<HouseholdInviteRecord | undefined> {
    const rows = await db
      .select()
      .from(householdInvitesTable)
      .where(eq(householdInvitesTable.tokenHash, tokenHash))
      .limit(1);

    return rows[0];
  }

  async acceptInvite(tx: TxClient, inviteId: string): Promise<HouseholdInviteRecord | undefined> {
    const timestamp = now();
    const rows = await tx
      .update(householdInvitesTable)
      .set({
        status: 'accepted',
        acceptedAt: timestamp,
        updatedAt: timestamp,
      })
      .where(
        and(
          eq(householdInvitesTable.id, inviteId),
          eq(householdInvitesTable.status, 'pending'),
          gt(householdInvitesTable.expiresAt, timestamp),
        ),
      )
      .returning();

    return rows[0];
  }

  async verifyUserEmail(tx: TxClient, userId: string): Promise<void> {
    await tx
      .update(usersTable)
      .set({ emailVerified: true, updatedAt: now() })
      .where(eq(usersTable.id, userId));
  }

  async rejectInvite(inviteId: string): Promise<HouseholdInviteRecord | undefined> {
    const timestamp = now();
    const rows = await db
      .update(householdInvitesTable)
      .set({
        status: 'rejected',
        rejectedAt: timestamp,
        updatedAt: timestamp,
      })
      .where(
        and(
          eq(householdInvitesTable.id, inviteId),
          eq(householdInvitesTable.status, 'pending'),
          gt(householdInvitesTable.expiresAt, timestamp),
        ),
      )
      .returning();

    return rows[0];
  }

  async cancelInvite(
    householdId: string,
    inviteId: string,
  ): Promise<HouseholdInviteRecord | undefined> {
    const timestamp = now();
    const rows = await db
      .update(householdInvitesTable)
      .set({
        status: 'canceled',
        canceledAt: timestamp,
        updatedAt: timestamp,
      })
      .where(
        and(
          eq(householdInvitesTable.householdId, householdId),
          eq(householdInvitesTable.id, inviteId),
          eq(householdInvitesTable.status, 'pending'),
        ),
      )
      .returning();

    return rows[0];
  }
}

export const householdsRepository = new HouseholdsRepository();
