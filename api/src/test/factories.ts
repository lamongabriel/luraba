import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { getPermissionsForRole } from '@/config/permissions';
import { accountsTable } from '@/db/schemas/accounts.schema';
import { entriesTable } from '@/db/schemas/entries.schema';
import { householdMembersTable, householdsTable } from '@/db/schemas/households.schema';
import { ledgerAccountsTable } from '@/db/schemas/ledger-accounts.schema';
import { transactionsTable } from '@/db/schemas/transactions.schema';
import { usersTable } from '@/db/schemas/users.schema';
import type { HouseholdContext } from '@/config/permissions';
import type { CreateAccountRequestBody } from '@/modules/accounts/accounts.types';

function randomSuffix() {
  return Math.random().toString(36).slice(2, 10);
}

export async function createUser(overrides: Partial<typeof usersTable.$inferInsert> = {}) {
  const rows = await db
    .insert(usersTable)
    .values({
      name: `Test User ${randomSuffix()}`,
      email: `user-${randomSuffix()}@example.com`,
      passwordHash: 'test-password-hash',
      preferredCurrency: 'BRL',
      preferredLanguage: 'en',
      preferredTimezone: 'America/Sao_Paulo',
      preferredDateFormat: 'DD/MM/YYYY',
      preferredPeriod: 'current_month',
      preferredTheme: 'system',
      ...overrides,
    })
    .returning();

  return rows[0];
}

export async function createHousehold(
  userId: string,
  overrides: Partial<typeof householdsTable.$inferInsert> = {},
) {
  const rows = await db
    .insert(householdsTable)
    .values({
      name: `Household ${randomSuffix()}`,
      description: null,
      defaultCurrencyId: 'BRL',
      countryCode: 'BR',
      timezone: 'America/Sao_Paulo',
      budgetMonthStartsOn: 1,
      creditExpenseTiming: 'spend_month',
      creditInstallmentBudgetMode: 'per_installment',
      createdByUserId: userId,
      ...overrides,
    })
    .returning();

  return rows[0];
}

export async function createHouseholdMembership(
  householdId: string,
  userId: string,
  role: 'owner' | 'admin' | 'member' | 'viewer' = 'owner',
) {
  const rows = await db
    .insert(householdMembersTable)
    .values({
      householdId,
      userId,
      role,
    })
    .returning();

  return rows[0];
}

export async function setDefaultHousehold(userId: string, householdId: string) {
  const rows = await db.update(usersTable).set({ defaultHouseholdId: householdId }).where(eq(usersTable.id, userId)).returning();
  return rows[0];
}

export function buildAccountInput(overrides: Partial<CreateAccountRequestBody> = {}): CreateAccountRequestBody {
  return {
    name: `Account ${randomSuffix()}`,
    type: 'depository',
    currencyCode: 'BRL',
    ...overrides,
  };
}

export async function createBalanceEntryForAccount(input: {
  householdId: string;
  accountId: string;
  amount: number;
  currencyCode?: string;
  postedDate?: Date;
}) {
  const ledgerRows = await db
    .select({
      id: ledgerAccountsTable.id,
    })
    .from(ledgerAccountsTable)
    .where(and(eq(ledgerAccountsTable.ownerType, 'account'), eq(ledgerAccountsTable.ownerId, input.accountId)))
    .limit(1);

  const ledger = ledgerRows[0];
  if (!ledger) {
    throw new Error('Account ledger not found for test balance setup');
  }

  const postedDate = input.postedDate ?? new Date('2026-01-15T00:00:00.000Z');
  const transactionRows = await db
    .insert(transactionsTable)
    .values({
      householdId: input.householdId,
      type: 'adjustment',
      description: `Balance setup ${randomSuffix()}`,
      includeInBudget: false,
      purchaseDate: postedDate,
      postedDate,
    })
    .returning();

  const transaction = transactionRows[0];

  const entryRows = await db
    .insert(entriesTable)
    .values({
      transactionId: transaction.id,
      ledgerAccountId: ledger.id,
      amount: input.amount,
      currencyId: input.currencyCode ?? 'BRL',
      createdAt: new Date(),
    })
    .returning();

  return entryRows[0];
}

export function buildHouseholdContext(input: {
  householdId: string;
  userId: string;
  role?: HouseholdContext['role'];
  permissions?: HouseholdContext['permissions'];
}): HouseholdContext {
  const role = input.role ?? 'owner';

  return {
    householdId: input.householdId,
    userId: input.userId,
    role,
    permissions: input.permissions ?? getPermissionsForRole(role),
  };
}

export async function findAccountRecord(accountId: string) {
  const rows = await db.select().from(accountsTable).where(eq(accountsTable.id, accountId)).limit(1);
  return rows[0];
}
