import type { CreateAccountInput } from '@luraba/contracts/accounts';
import type { CreateCategoryInput } from '@luraba/contracts/categories';
import type { CreateCreditCardInput } from '@luraba/contracts/credit-cards';
import type { CreateMerchantInput } from '@luraba/contracts/merchants';
import type { CreatePaymentMethodInput } from '@luraba/contracts/payment-methods';
import type { CreateTagInput } from '@luraba/contracts/tags';
import { and, eq } from 'drizzle-orm';
import type { HouseholdContext } from '@/config/permissions';
import { getPermissionsForRole } from '@/config/permissions';
import { db } from '@/db';
import { accountsTable } from '@/db/schemas/accounts.schema';
import { entriesTable } from '@/db/schemas/entries.schema';
import { householdMembersTable, householdsTable } from '@/db/schemas/households.schema';
import { ledgerAccountsTable } from '@/db/schemas/ledger-accounts.schema';
import { transactionsTable } from '@/db/schemas/transactions.schema';
import { usersTable } from '@/db/schemas/users.schema';
import * as accountsService from '@/modules/accounts/accounts.service';
import { now, parseISODate } from '@/shared/lib/date';

function randomSuffix() {
  return Math.random().toString(36).slice(2, 10);
}

export async function createUser(overrides: Partial<typeof usersTable.$inferInsert> = {}) {
  const rows = await db
    .insert(usersTable)
    .values({
      name: `Test User ${randomSuffix()}`,
      email: `user-${randomSuffix()}@example.com`,
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
  const rows = await db
    .update(usersTable)
    .set({ defaultHouseholdId: householdId })
    .where(eq(usersTable.id, userId))
    .returning();
  return rows[0];
}

export function buildAccountInput(overrides: Partial<CreateAccountInput> = {}): CreateAccountInput {
  const type = overrides.type ?? 'cash';
  const defaultDetails: CreateAccountInput['details'] = (() => {
    switch (type) {
      case 'cash':
        return { kind: 'cash', subtype: 'other' };
      case 'investment':
        return { kind: 'investment', subtype: 'other' };
      case 'crypto':
        return { kind: 'crypto', subtype: 'other' };
      case 'property':
        return { kind: 'property', subtype: 'other' };
      case 'vehicle':
        return { kind: 'vehicle', subtype: 'other' };
      case 'loan':
        return { kind: 'loan', subtype: 'other' };
      case 'other_asset':
        return { kind: 'other_asset', subtype: 'other' };
      case 'other_liability':
        return { kind: 'other_liability', subtype: 'other' };
    }
  })();

  return {
    name: `Account ${randomSuffix()}`,
    type,
    details: overrides.details ?? defaultDetails,
    currencyCode: 'BRL',
    ...overrides,
  };
}

export function buildMerchantInput(
  overrides: Partial<CreateMerchantInput> = {},
): CreateMerchantInput {
  return {
    name: `Merchant ${randomSuffix()}`,
    domain: `${randomSuffix()}.example.com`,
    ...overrides,
  };
}

export function buildCreditCardInput(
  overrides: Partial<CreateCreditCardInput> = {},
): CreateCreditCardInput {
  return {
    name: `Card ${randomSuffix()}`,
    ownerAccountId: overrides.ownerAccountId ?? '00000000-0000-0000-0000-000000000000',
    brand: 'Visa',
    last4: '4242',
    closingDay: 25,
    dueDay: 5,
    ...overrides,
  };
}

export async function createCreditCardOwner(
  context: Pick<
    HouseholdContext,
    | 'householdId'
    | 'userId'
    | 'role'
    | 'permissions'
    | 'timezone'
    | 'creditExpenseTiming'
    | 'creditInstallmentBudgetMode'
  >,
  overrides: Partial<CreateAccountInput> = {},
) {
  return accountsService.createAccount(
    context,
    buildAccountInput({
      name: `Card owner ${randomSuffix()}`,
      type: 'cash',
      currencyCode: 'BRL',
      ...overrides,
    }),
  );
}

export function buildCategoryInput(
  overrides: Partial<CreateCategoryInput> = {},
): CreateCategoryInput {
  return {
    name: `Category ${randomSuffix()}`,
    type: 'expense',
    color: '#2563EB',
    icon: 'ShoppingBag02Icon',
    ...overrides,
  };
}

export function buildTagInput(overrides: Partial<CreateTagInput> = {}): CreateTagInput {
  return {
    name: `Tag ${randomSuffix()}`,
    color: '#7C3AED',
    icon: 'Tag01Icon',
    ...overrides,
  };
}

export function buildPaymentMethodInput(
  overrides: Partial<CreatePaymentMethodInput> = {},
): CreatePaymentMethodInput {
  return {
    name: `Payment Method ${randomSuffix()}`,
    color: '#0EA5E9',
    icon: 'CreditCardIcon',
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
    .where(
      and(
        eq(ledgerAccountsTable.ownerType, 'account'),
        eq(ledgerAccountsTable.ownerId, input.accountId),
      ),
    )
    .limit(1);

  const ledger = ledgerRows[0];
  if (!ledger) {
    throw new Error('Account ledger not found for test balance setup');
  }

  const postedDate = input.postedDate ?? parseISODate('2026-01-15');
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
      createdAt: now(),
    })
    .returning();

  return entryRows[0];
}

export function buildHouseholdContext(input: {
  householdId: string;
  userId: string;
  role?: HouseholdContext['role'];
  permissions?: HouseholdContext['permissions'];
  timezone?: HouseholdContext['timezone'];
  creditExpenseTiming?: HouseholdContext['creditExpenseTiming'];
  creditInstallmentBudgetMode?: HouseholdContext['creditInstallmentBudgetMode'];
}): HouseholdContext {
  const role = input.role ?? 'owner';

  return {
    householdId: input.householdId,
    userId: input.userId,
    role,
    permissions: input.permissions ?? getPermissionsForRole(role),
    timezone: input.timezone ?? 'America/Sao_Paulo',
    creditExpenseTiming: input.creditExpenseTiming ?? 'spend_month',
    creditInstallmentBudgetMode: input.creditInstallmentBudgetMode ?? 'per_installment',
  };
}

export async function findAccountRecord(accountId: string) {
  const rows = await db
    .select()
    .from(accountsTable)
    .where(eq(accountsTable.id, accountId))
    .limit(1);
  return rows[0];
}
