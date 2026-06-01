import { and, asc, eq, ne, sql } from 'drizzle-orm';
import { db } from '@/db';
import { householdInvitesTable, householdMembersTable, householdsTable } from '@/db/schemas/households.schema';
import { usersTable } from '@/db/schemas/users.schema';
import { now } from '@/shared/lib/date';
import { currencySchema } from '@/shared/validation/preferences';
import type { Currency } from '@/shared/validation/preferences';
import type {
  CreateHouseholdInviteRequestBody,
  CreateHouseholdRequestBody,
  HouseholdInviteRecord,
  HouseholdMemberRecord,
  HouseholdRecord,
  UpdateHouseholdRequestBody,
} from './households.types';

export type TxClient = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type HouseholdMembership = HouseholdMemberRecord & {
  householdName: HouseholdRecord['name'];
  defaultCurrencyId: Currency;
  countryCode: HouseholdRecord['countryCode'];
  timezone: HouseholdRecord['timezone'];
  budgetMonthStartsOn: HouseholdRecord['budgetMonthStartsOn'];
  creditExpenseTiming: HouseholdRecord['creditExpenseTiming'];
  creditInstallmentBudgetMode: HouseholdRecord['creditInstallmentBudgetMode'];
};

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

  async updateHousehold(householdId: string, values: UpdateHouseholdRequestBody): Promise<HouseholdRecord | undefined> {
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
    const rows = await db.select().from(householdsTable).where(eq(householdsTable.id, householdId)).limit(1);
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

  async findUserDefaults(userId: string): Promise<{
    id: string;
    name: string;
    preferredCurrency: Currency;
    preferredTimezone: 'America/Sao_Paulo' | 'UTC';
    defaultHouseholdId: string | null;
  } | undefined> {
    const rows = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        preferredCurrency: usersTable.preferredCurrency,
        preferredTimezone: usersTable.preferredTimezone,
        defaultHouseholdId: usersTable.defaultHouseholdId,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    return rows[0];
  }

  async findMembership(householdId: string, userId: string): Promise<HouseholdMembership | undefined> {
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
      .where(and(eq(householdMembersTable.householdId, householdId), eq(householdMembersTable.userId, userId)));

    const row = rows[0];
    if (!row) {
      return undefined;
    }

    return {
      ...row,
      defaultCurrencyId: currencySchema.parse(row.defaultCurrencyId),
    };
  }

  async listHouseholdsForUser(userId: string) {
    return db
      .select({
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
      })
      .from(householdMembersTable)
      .innerJoin(householdsTable, eq(householdsTable.id, householdMembersTable.householdId))
      .where(eq(householdMembersTable.userId, userId))
      .orderBy(asc(householdsTable.name));
  }

  async listMembers(householdId: string) {
    return db
      .select({
        householdId: householdMembersTable.householdId,
        userId: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        role: householdMembersTable.role,
        createdAt: householdMembersTable.createdAt,
        updatedAt: householdMembersTable.updatedAt,
      })
      .from(householdMembersTable)
      .innerJoin(usersTable, eq(usersTable.id, householdMembersTable.userId))
      .where(eq(householdMembersTable.householdId, householdId))
      .orderBy(asc(usersTable.name));
  }

  async countOwners(householdId: string): Promise<number> {
    const rows = await db
      .select({ count: sql<number>`count(*)::integer` })
      .from(householdMembersTable)
      .where(and(eq(householdMembersTable.householdId, householdId), eq(householdMembersTable.role, 'owner')));

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
      .where(and(eq(householdMembersTable.householdId, householdId), eq(householdMembersTable.userId, userId)))
      .returning();

    return rows[0];
  }

  async removeMember(householdId: string, userId: string): Promise<HouseholdMemberRecord | undefined> {
    const rows = await db
      .delete(householdMembersTable)
      .where(and(eq(householdMembersTable.householdId, householdId), eq(householdMembersTable.userId, userId)))
      .returning();

    return rows[0];
  }

  async createInvite(
    householdId: string,
    invitedByUserId: string,
    values: CreateHouseholdInviteRequestBody,
  ): Promise<HouseholdInviteRecord> {
    const rows = await db
      .insert(householdInvitesTable)
      .values({
        householdId,
        email: values.email,
        role: values.role,
        invitedByUserId,
      })
      .returning();

    return rows[0];
  }

  async listInvitesForHousehold(householdId: string) {
    return db
      .select({
        id: householdInvitesTable.id,
        householdId: householdInvitesTable.householdId,
        householdName: householdsTable.name,
        email: householdInvitesTable.email,
        role: householdInvitesTable.role,
        status: householdInvitesTable.status,
        invitedByUserId: householdInvitesTable.invitedByUserId,
        createdAt: householdInvitesTable.createdAt,
        updatedAt: householdInvitesTable.updatedAt,
        acceptedAt: householdInvitesTable.acceptedAt,
        revokedAt: householdInvitesTable.revokedAt,
      })
      .from(householdInvitesTable)
      .innerJoin(householdsTable, eq(householdsTable.id, householdInvitesTable.householdId))
      .where(eq(householdInvitesTable.householdId, householdId))
      .orderBy(asc(householdInvitesTable.email));
  }

  async listPendingInvitesForEmail(email: string) {
    return db
      .select({
        id: householdInvitesTable.id,
        householdId: householdInvitesTable.householdId,
        householdName: householdsTable.name,
        email: householdInvitesTable.email,
        role: householdInvitesTable.role,
        status: householdInvitesTable.status,
        invitedByUserId: householdInvitesTable.invitedByUserId,
        createdAt: householdInvitesTable.createdAt,
        updatedAt: householdInvitesTable.updatedAt,
        acceptedAt: householdInvitesTable.acceptedAt,
        revokedAt: householdInvitesTable.revokedAt,
      })
      .from(householdInvitesTable)
      .innerJoin(householdsTable, eq(householdsTable.id, householdInvitesTable.householdId))
      .where(and(eq(householdInvitesTable.email, email), eq(householdInvitesTable.status, 'pending')))
      .orderBy(asc(householdsTable.name));
  }

  async findPendingInviteById(inviteId: string): Promise<HouseholdInviteRecord | undefined> {
    const rows = await db
      .select()
      .from(householdInvitesTable)
      .where(and(eq(householdInvitesTable.id, inviteId), eq(householdInvitesTable.status, 'pending')));

    return rows[0];
  }

  async acceptInvite(tx: TxClient, inviteId: string): Promise<void> {
    await tx
      .update(householdInvitesTable)
      .set({ status: 'accepted', acceptedAt: now(), updatedAt: now() })
      .where(eq(householdInvitesTable.id, inviteId));
  }

  async revokeInvite(householdId: string, inviteId: string): Promise<HouseholdInviteRecord | undefined> {
    const rows = await db
      .update(householdInvitesTable)
      .set({ status: 'revoked', revokedAt: now(), updatedAt: now() })
      .where(
        and(
          eq(householdInvitesTable.householdId, householdId),
          eq(householdInvitesTable.id, inviteId),
          ne(householdInvitesTable.status, 'accepted'),
        ),
      )
      .returning();

    return rows[0];
  }
}

export const householdsRepository = new HouseholdsRepository();
