import { and, asc, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import { db } from '@/db';
import { accountsTable } from '@/db/schemas/accounts.schema';
import { creditCardBillingCyclesTable } from '@/db/schemas/credit-card-billing-cycles.schema';
import { creditCardBudgetRecognitionsTable } from '@/db/schemas/credit-card-budget-recognitions.schema';
import { creditCardInstallmentsTable } from '@/db/schemas/credit-card-installments.schema';
import { creditCardPaymentAllocationsTable } from '@/db/schemas/credit-card-payment-allocations.schema';
import { creditCardPaymentsTable } from '@/db/schemas/credit-card-payments.schema';
import { creditCardPurchasesTable } from '@/db/schemas/credit-card-purchases.schema';
import { creditCardsTable } from '@/db/schemas/credit-cards.schema';
import { ledgerAccountsTable } from '@/db/schemas/ledger-accounts.schema';
import { transactionsTable } from '@/db/schemas/transactions.schema';
import { usersTable } from '@/db/schemas/users.schema';
import * as accountsRepository from '@/modules/accounts/accounts.repository';
import * as baseTxRepository from '@/modules/transactions/transactions.repository';
import { ConflictError, NotFoundError, ValidationError } from '@/shared/errors';
import {
  CreateCreditCardDto,
  CreateCreditCardPaymentDto,
  CreateCreditCardPurchaseDto,
  CreditCardCycleDetailResponse,
  CreditCardCycleSummary,
  CreditCardForecastQuery,
  CreditCardForecastResponse,
  CreditCardPaymentResponse,
  CreditCardPurchaseResponse,
  CreditCardResponse,
  UpdateCreditCardDto,
  UpdateCreditCardCycleDto,
} from './credit-cards.types';
import {
  addMonths,
  buildCycleForPurchaseDate,
  buildCycleFromClosingDate,
  formatDateOnly,
  formatMonthKey,
  getTodayInTimezone,
  monthStart,
  parseMonthKey,
} from './credit-cards.utils';

type TxClient = baseTxRepository.TxClient;

type CreditCardRow = {
  id: string;
  accountId: string;
  userId: string;
  name: string;
  institutionName: string | null;
  institutionDomain: string | null;
  notes: string | null;
  classification: 'liability';
  type: 'credit_card';
  currencyCode: string;
  brand: string;
  productType: 'credit';
  last4: string;
  color: string | null;
  closingDay: number;
  dueDay: number;
  unappliedCreditAmount: number;
  createdAt: Date;
  updatedAt: Date;
};

type UserCreditContext = {
  id: string;
  preferredCurrency: string;
  preferredTimezone: string;
  creditExpenseTiming: 'spend_month' | 'payment_month';
  creditInstallmentBudgetMode: 'per_installment' | 'full_amount';
};

type CreditCardSelectRow = {
  id: string;
  accountId: string;
  userId: string;
  name: string;
  institutionName: string | null;
  institutionDomain: string | null;
  notes: string | null;
  classification: 'asset' | 'liability';
  type: 'depository' | 'loan' | 'credit_card' | 'property' | 'vehicle' | 'other_asset' | 'other_liability';
  currencyCode: string;
  brand: string;
  productType: 'credit';
  last4: string;
  color: string | null;
  closingDay: number;
  dueDay: number;
  unappliedCreditAmount: number;
  createdAt: Date;
  updatedAt: Date;
};

const creditCardSelect = {
  id: creditCardsTable.id,
  accountId: creditCardsTable.accountId,
  userId: creditCardsTable.userId,
  name: accountsTable.name,
  institutionName: accountsTable.institutionName,
  institutionDomain: accountsTable.institutionDomain,
  notes: accountsTable.notes,
  classification: accountsTable.classification,
  type: accountsTable.type,
  currencyCode: accountsTable.currencyId,
  brand: creditCardsTable.brand,
  productType: creditCardsTable.productType,
  last4: creditCardsTable.last4,
  color: creditCardsTable.color,
  closingDay: creditCardsTable.closingDay,
  dueDay: creditCardsTable.dueDay,
  unappliedCreditAmount: creditCardsTable.unappliedCreditAmount,
  createdAt: creditCardsTable.createdAt,
  updatedAt: creditCardsTable.updatedAt,
} as const;

function splitInstallmentAmounts(totalAmount: number, installmentCount: number): number[] {
  const baseAmount = Math.floor(totalAmount / installmentCount);
  const remainder = totalAmount - baseAmount * installmentCount;
  return Array.from({ length: installmentCount }, (_value, index) =>
    index === installmentCount - 1 ? baseAmount + remainder : baseAmount,
  );
}

function toCreditCardRow(row: CreditCardSelectRow): CreditCardRow {
  return {
    ...row,
    classification: 'liability',
    type: 'credit_card',
    institutionName: row.institutionName ?? null,
    institutionDomain: row.institutionDomain ?? null,
    notes: row.notes ?? null,
    color: row.color ?? null,
  };
}

function mapCycleRow(row: typeof creditCardBillingCyclesTable.$inferSelect): CreditCardCycleSummary {
  return {
    id: row.id,
    creditCardId: row.creditCardId,
    periodStart: formatDateOnly(row.periodStart),
    periodEnd: formatDateOnly(row.periodEnd),
    closingDate: formatDateOnly(row.closingDate),
    dueDate: formatDateOnly(row.dueDate),
    status: row.status,
    statementAmount: row.statementAmount,
    paidAmount: row.paidAmount,
    remainingAmount: row.remainingAmount,
  };
}

function rangesOverlap(
  left: { periodStart: Date; periodEnd: Date },
  right: { periodStart: Date; periodEnd: Date },
): boolean {
  return left.periodStart <= right.periodEnd && right.periodStart <= left.periodEnd;
}

async function findUserCreditContext(userId: string): Promise<UserCreditContext> {
  const rows = await db
    .select({
      id: usersTable.id,
      preferredCurrency: usersTable.preferredCurrency,
      preferredTimezone: usersTable.preferredTimezone,
      creditExpenseTiming: usersTable.creditExpenseTiming,
      creditInstallmentBudgetMode: usersTable.creditInstallmentBudgetMode,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  const user = rows[0];
  if (!user) throw new NotFoundError('User');
  return user;
}

async function findOwnedCreditCard(userId: string, creditCardId: string): Promise<CreditCardRow> {
  const rows = await db
    .select(creditCardSelect)
    .from(creditCardsTable)
    .innerJoin(accountsTable, eq(accountsTable.id, creditCardsTable.accountId))
    .where(and(eq(creditCardsTable.id, creditCardId), eq(creditCardsTable.userId, userId)));

  const row = rows[0] as CreditCardSelectRow | undefined;
  if (!row) throw new NotFoundError('Credit card');
  return toCreditCardRow(row);
}

async function listOwnedCreditCards(userId: string): Promise<CreditCardRow[]> {
  const rows = await db
    .select(creditCardSelect)
    .from(creditCardsTable)
    .innerJoin(accountsTable, eq(accountsTable.id, creditCardsTable.accountId))
    .where(eq(creditCardsTable.userId, userId))
    .orderBy(asc(accountsTable.name));

  return rows.map((row) => toCreditCardRow(row as CreditCardSelectRow));
}

async function computeCardBalance(accountId: string): Promise<number> {
  const ledger = await accountsRepository.findLedgerByAccountId(accountId);
  if (!ledger) throw new NotFoundError('Credit card ledger');
  const balance = await accountsRepository.getAccountBalanceByLedgerId(ledger.id);
  return -balance;
}

async function mapCreditCard(card: CreditCardRow): Promise<CreditCardResponse> {
  return {
    ...card,
    balance: await computeCardBalance(card.accountId),
  };
}

async function ensureCurrency(currencyCode: string): Promise<void> {
  const currency = await baseTxRepository.findCurrencyByCode(currencyCode);
  if (!currency) throw new NotFoundError('Currency');
}

async function ensureExpenseCategory(userId: string, categoryId: string): Promise<void> {
  const category = await baseTxRepository.findOwnedCategory(categoryId, userId);
  if (!category) throw new NotFoundError('Category');
  if (category.type !== 'expense') {
    throw new ValidationError(`Category ${categoryId} must be of type expense`);
  }
}

async function ensureMerchant(userId: string, merchantId?: string): Promise<void> {
  if (!merchantId) return;
  const merchant = await baseTxRepository.findOwnedMerchant(merchantId, userId);
  if (!merchant) throw new NotFoundError('Merchant');
}

async function resolveCreditCardPaymentMethod(currencyCode: string) {
  const paymentMethod = await baseTxRepository.findPaymentMethodByCode('credit_card', currencyCode);
  if (!paymentMethod) {
    throw new ValidationError(`Payment method credit_card is not available for currency ${currencyCode}`);
  }
  return paymentMethod;
}

async function ensureCycleForClosingDate(tx: TxClient, card: CreditCardRow, closingDate: Date) {
  const cycleShape = buildCycleFromClosingDate(closingDate, card.closingDay, card.dueDay);
  const existing = await tx
    .select()
    .from(creditCardBillingCyclesTable)
    .where(
      and(
        eq(creditCardBillingCyclesTable.creditCardId, card.id),
        eq(creditCardBillingCyclesTable.periodStart, cycleShape.periodStart),
      ),
    );

  if (existing[0]) {
    return existing[0];
  }

  const created = await tx
    .insert(creditCardBillingCyclesTable)
    .values({
      creditCardId: card.id,
      periodStart: cycleShape.periodStart,
      periodEnd: cycleShape.periodEnd,
      closingDate: cycleShape.closingDate,
      dueDate: cycleShape.dueDate,
      status: 'open',
      statementAmount: 0,
      paidAmount: 0,
      remainingAmount: 0,
    })
    .returning();

  return created[0];
}

async function ensureCurrentCycle(tx: TxClient, card: CreditCardRow, timezone: string) {
  const today = getTodayInTimezone(timezone);
  const cycleShape = buildCycleForPurchaseDate(today, card.closingDay, card.dueDay);
  return ensureCycleForClosingDate(tx, card, cycleShape.closingDate);
}

async function findOwnedCycle(
  tx: TxClient,
  creditCardId: string,
  cycleId: string,
): Promise<typeof creditCardBillingCyclesTable.$inferSelect> {
  const rows = await tx
    .select()
    .from(creditCardBillingCyclesTable)
    .where(and(eq(creditCardBillingCyclesTable.id, cycleId), eq(creditCardBillingCyclesTable.creditCardId, creditCardId)));

  const cycle = rows[0];
  if (!cycle) throw new NotFoundError('Billing cycle');
  return cycle;
}

async function validateCycleWindowDoesNotOverlap(
  tx: TxClient,
  cardId: string,
  cycleId: string,
  candidate: {
    periodStart: Date;
    periodEnd: Date;
  },
): Promise<void> {
  const otherCycles = await tx
    .select({
      id: creditCardBillingCyclesTable.id,
      periodStart: creditCardBillingCyclesTable.periodStart,
      periodEnd: creditCardBillingCyclesTable.periodEnd,
    })
    .from(creditCardBillingCyclesTable)
    .where(and(eq(creditCardBillingCyclesTable.creditCardId, cardId), sql`${creditCardBillingCyclesTable.id} <> ${cycleId}`));

  const overlappingCycle = otherCycles.find((cycle) =>
    rangesOverlap(candidate, {
      periodStart: cycle.periodStart,
      periodEnd: cycle.periodEnd,
    }),
  );

  if (overlappingCycle) {
    throw new ValidationError('Billing cycle dates cannot overlap with another billing cycle on this credit card');
  }
}

async function createInstallmentsForPurchase(
  tx: TxClient,
  card: CreditCardRow,
  purchaseId: string,
  purchaseDate: Date,
  totalAmount: number,
  installmentCount: number,
  startInstallmentNumber = 1,
): Promise<Array<typeof creditCardInstallmentsTable.$inferSelect>> {
  const firstCycleShape = buildCycleForPurchaseDate(purchaseDate, card.closingDay, card.dueDay);
  const amounts = splitInstallmentAmounts(totalAmount, installmentCount);
  const createdRows: Array<typeof creditCardInstallmentsTable.$inferSelect> = [];

  for (let index = startInstallmentNumber - 1; index < installmentCount; index += 1) {
    const closingDate = addMonths(firstCycleShape.closingDate, index);
    const cycle = await ensureCycleForClosingDate(tx, card, closingDate);
    const created = await tx
      .insert(creditCardInstallmentsTable)
      .values({
        creditCardId: card.id,
        purchaseId,
        billingCycleId: cycle.id,
        installmentNumber: index + 1,
        amount: amounts[index],
      })
      .returning();

    createdRows.push(created[0]);
  }

  return createdRows;
}

async function recreateBudgetRecognitionsForPurchase(
  tx: TxClient,
  purchase: {
    id: string;
    purchaseAmount: number;
    installmentCount: number;
    budgetExpenseTiming: 'spend_month' | 'payment_month';
    budgetInstallmentMode: 'per_installment' | 'full_amount';
  },
  params: {
    categoryId: string;
    currencyCode: string;
    purchaseDate: Date;
    currentMonthStart?: Date;
  },
): Promise<void> {
  const installments = await tx
    .select({
      id: creditCardInstallmentsTable.id,
      amount: creditCardInstallmentsTable.amount,
      installmentNumber: creditCardInstallmentsTable.installmentNumber,
      closingDate: creditCardBillingCyclesTable.closingDate,
      dueDate: creditCardBillingCyclesTable.dueDate,
    })
    .from(creditCardInstallmentsTable)
    .innerJoin(
      creditCardBillingCyclesTable,
      eq(creditCardBillingCyclesTable.id, creditCardInstallmentsTable.billingCycleId),
    )
    .where(eq(creditCardInstallmentsTable.purchaseId, purchase.id))
    .orderBy(asc(creditCardInstallmentsTable.installmentNumber));

  const rows: Array<typeof creditCardBudgetRecognitionsTable.$inferInsert> = [];
  const currentMonthStart = params.currentMonthStart;

  const shouldIncludeMonth = (date: Date) => !currentMonthStart || date >= currentMonthStart;

  if (purchase.budgetInstallmentMode === 'per_installment') {
    for (const installment of installments) {
      const budgetMonth =
        purchase.budgetExpenseTiming === 'spend_month'
          ? monthStart(installment.closingDate)
          : monthStart(installment.dueDate);

      if (!shouldIncludeMonth(budgetMonth)) continue;

      rows.push({
        purchaseId: purchase.id,
        installmentId: installment.id,
        categoryId: params.categoryId,
        currencyId: params.currencyCode,
        budgetMonth,
        amount: installment.amount,
      });
    }
  } else {
    const firstInstallment = installments[0];
    const budgetMonth =
      purchase.budgetExpenseTiming === 'spend_month'
        ? monthStart(params.purchaseDate)
        : monthStart(firstInstallment?.dueDate ?? params.purchaseDate);

    if (shouldIncludeMonth(budgetMonth)) {
      rows.push({
        purchaseId: purchase.id,
        installmentId: null,
        categoryId: params.categoryId,
        currencyId: params.currencyCode,
        budgetMonth,
        amount: purchase.purchaseAmount,
      });
    }
  }

  if (rows.length > 0) {
    await tx.insert(creditCardBudgetRecognitionsTable).values(rows);
  }
}

async function syncCardCycles(tx: TxClient, card: CreditCardRow, timezone: string): Promise<Array<typeof creditCardBillingCyclesTable.$inferSelect>> {
  await ensureCurrentCycle(tx, card, timezone);

  const [cycles, installmentSums, allocationSums] = await Promise.all([
    tx
      .select()
      .from(creditCardBillingCyclesTable)
      .where(eq(creditCardBillingCyclesTable.creditCardId, card.id))
      .orderBy(asc(creditCardBillingCyclesTable.closingDate)),
    tx
      .select({
        billingCycleId: creditCardInstallmentsTable.billingCycleId,
        amount: sql<number>`coalesce(sum(${creditCardInstallmentsTable.amount}), 0)::integer`,
      })
      .from(creditCardInstallmentsTable)
      .where(eq(creditCardInstallmentsTable.creditCardId, card.id))
      .groupBy(creditCardInstallmentsTable.billingCycleId),
    tx
      .select({
        billingCycleId: creditCardPaymentAllocationsTable.billingCycleId,
        amount: sql<number>`coalesce(sum(${creditCardPaymentAllocationsTable.amount}), 0)::integer`,
      })
      .from(creditCardPaymentAllocationsTable)
      .innerJoin(creditCardPaymentsTable, eq(creditCardPaymentsTable.id, creditCardPaymentAllocationsTable.paymentId))
      .where(eq(creditCardPaymentsTable.creditCardId, card.id))
      .groupBy(creditCardPaymentAllocationsTable.billingCycleId),
  ]);

  const today = getTodayInTimezone(timezone);
  const installmentTotals = new Map(installmentSums.map((row) => [row.billingCycleId, row.amount]));
  const paymentTotals = new Map(allocationSums.map((row) => [row.billingCycleId ?? '', row.amount]));
  let carryCredit = card.unappliedCreditAmount;

  const updatedCycles: Array<typeof creditCardBillingCyclesTable.$inferSelect> = [];

  for (const cycle of cycles) {
    const statementAmount = installmentTotals.get(cycle.id) ?? 0;
    const paidAmount = paymentTotals.get(cycle.id) ?? 0;
    let remainingAmount = Math.max(statementAmount - paidAmount, 0);

    if (carryCredit > 0 && remainingAmount > 0) {
      const appliedCredit = Math.min(carryCredit, remainingAmount);
      remainingAmount -= appliedCredit;
      carryCredit -= appliedCredit;
    }

    const status =
      cycle.closingDate < today
        ? remainingAmount === 0
          ? 'paid'
          : 'closed'
        : 'open';

    const [updated] = await tx
      .update(creditCardBillingCyclesTable)
      .set({
        statementAmount,
        paidAmount,
        remainingAmount,
        status,
        updatedAt: new Date(),
      })
      .where(eq(creditCardBillingCyclesTable.id, cycle.id))
      .returning();

    updatedCycles.push(updated);
  }

  return updatedCycles;
}

async function rebuildOpenAndFutureSchedules(tx: TxClient, card: CreditCardRow, timezone: string): Promise<void> {
  const today = getTodayInTimezone(timezone);
  const currentMonthStart = monthStart(today);

  const purchaseRows = await tx
    .select({
      purchaseId: creditCardPurchasesTable.id,
      purchaseAmount: creditCardPurchasesTable.purchaseAmount,
      installmentCount: creditCardPurchasesTable.installmentCount,
      budgetExpenseTiming: creditCardPurchasesTable.budgetExpenseTiming,
      budgetInstallmentMode: creditCardPurchasesTable.budgetInstallmentMode,
      transactionId: creditCardPurchasesTable.transactionId,
      categoryId: transactionsTable.categoryId,
      purchaseDate: transactionsTable.purchaseDate,
    })
    .from(creditCardPurchasesTable)
    .innerJoin(transactionsTable, eq(transactionsTable.id, creditCardPurchasesTable.transactionId))
    .where(eq(creditCardPurchasesTable.creditCardId, card.id));

  const purchaseIds = purchaseRows.map((purchase) => purchase.purchaseId);
  if (purchaseIds.length > 0) {
    await tx
      .delete(creditCardBudgetRecognitionsTable)
      .where(
        and(
          inArray(creditCardBudgetRecognitionsTable.purchaseId, purchaseIds),
          gte(creditCardBudgetRecognitionsTable.budgetMonth, currentMonthStart),
        ),
      );
  }

  const openOrFutureCycleIds = await tx
    .select({ id: creditCardBillingCyclesTable.id })
    .from(creditCardBillingCyclesTable)
    .where(and(eq(creditCardBillingCyclesTable.creditCardId, card.id), gte(creditCardBillingCyclesTable.closingDate, today)));

  if (openOrFutureCycleIds.length > 0) {
    await tx
      .delete(creditCardInstallmentsTable)
      .where(inArray(creditCardInstallmentsTable.billingCycleId, openOrFutureCycleIds.map((row) => row.id)));

    await tx
      .delete(creditCardBillingCyclesTable)
      .where(and(eq(creditCardBillingCyclesTable.creditCardId, card.id), gte(creditCardBillingCyclesTable.closingDate, today)));
  }

  for (const purchase of purchaseRows) {
    const preservedInstallments = await tx
      .select({
        installmentNumber: creditCardInstallmentsTable.installmentNumber,
      })
      .from(creditCardInstallmentsTable)
      .innerJoin(
        creditCardBillingCyclesTable,
        eq(creditCardBillingCyclesTable.id, creditCardInstallmentsTable.billingCycleId),
      )
      .where(
        and(
          eq(creditCardInstallmentsTable.purchaseId, purchase.purchaseId),
          lt(creditCardBillingCyclesTable.closingDate, today),
        ),
      )
      .orderBy(desc(creditCardInstallmentsTable.installmentNumber));

    const nextInstallmentNumber = (preservedInstallments[0]?.installmentNumber ?? 0) + 1;
    if (nextInstallmentNumber <= purchase.installmentCount) {
      await createInstallmentsForPurchase(
        tx,
        card,
        purchase.purchaseId,
        purchase.purchaseDate,
        purchase.purchaseAmount,
        purchase.installmentCount,
        nextInstallmentNumber,
      );
    }

    await recreateBudgetRecognitionsForPurchase(
      tx,
      {
        id: purchase.purchaseId,
        purchaseAmount: purchase.purchaseAmount,
        installmentCount: purchase.installmentCount,
        budgetExpenseTiming: purchase.budgetExpenseTiming,
        budgetInstallmentMode: purchase.budgetInstallmentMode,
      },
      {
        categoryId: purchase.categoryId!,
        currencyCode: card.currencyCode,
        purchaseDate: purchase.purchaseDate,
        currentMonthStart,
      },
    );
  }

  await syncCardCycles(tx, card, timezone);
}

async function createUnderlyingExpenseTransaction(
  tx: TxClient,
  params: {
    userId: string;
    card: CreditCardRow;
    paymentMethodId: string;
    description: string;
    amount: number;
    categoryId: string;
    merchantId?: string;
    purchaseDate: Date;
    postedDate: Date;
  },
) {
  const accountLedger = await baseTxRepository.findLedgerAccountByOwner('account', params.card.accountId);
  if (!accountLedger) throw new NotFoundError('Credit card ledger');

  const expenseLedger = await baseTxRepository.findOrCreateSystemLedger(
    tx,
    `system:expense:${params.card.currencyCode}`,
    'liability',
    params.card.currencyCode,
  );

  const createdTransaction = await baseTxRepository.createTransaction(tx, {
    userId: params.userId,
    type: 'expense',
    paymentMethodId: params.paymentMethodId,
    categoryId: params.categoryId,
    description: params.description,
    includeInBudget: false,
    merchantId: params.merchantId,
    purchaseDate: params.purchaseDate,
    postedDate: params.postedDate,
  });

  await baseTxRepository.createEntries(tx, [
    {
      transactionId: createdTransaction.id,
      ledgerAccountId: accountLedger.id,
      amount: -params.amount,
      currencyId: params.card.currencyCode,
      categoryId: params.categoryId,
    },
    {
      transactionId: createdTransaction.id,
      ledgerAccountId: expenseLedger.id,
      amount: params.amount,
      currencyId: params.card.currencyCode,
    },
  ]);

  return createdTransaction;
}

async function createUnderlyingPaymentTransaction(
  tx: TxClient,
  params: {
    userId: string;
    card: CreditCardRow;
    fromAccountId: string;
    description: string;
    amount: number;
    paymentDate: Date;
    postedDate: Date;
  },
) {
  const fromLedger = await baseTxRepository.findLedgerAccountByOwner('account', params.fromAccountId);
  const toLedger = await baseTxRepository.findLedgerAccountByOwner('account', params.card.accountId);
  if (!fromLedger || !toLedger) throw new NotFoundError('Account ledger');

  const createdTransaction = await baseTxRepository.createTransaction(tx, {
    userId: params.userId,
    type: 'transfer',
    paymentMethodId: null,
    categoryId: null,
    description: params.description,
    includeInBudget: false,
    merchantId: null,
    purchaseDate: params.paymentDate,
    postedDate: params.postedDate,
  });

  await baseTxRepository.createEntries(tx, [
    {
      transactionId: createdTransaction.id,
      ledgerAccountId: fromLedger.id,
      amount: -params.amount,
      currencyId: params.card.currencyCode,
    },
    {
      transactionId: createdTransaction.id,
      ledgerAccountId: toLedger.id,
      amount: params.amount,
      currencyId: params.card.currencyCode,
    },
  ]);

  return createdTransaction;
}

async function loadCycleItems(cardId: string, cycleId: string) {
  return db
    .select({
      installmentId: creditCardInstallmentsTable.id,
      purchaseId: creditCardPurchasesTable.id,
      transactionId: creditCardPurchasesTable.transactionId,
      description: transactionsTable.description,
      categoryId: transactionsTable.categoryId,
      merchantId: transactionsTable.merchantId,
      installmentNumber: creditCardInstallmentsTable.installmentNumber,
      installmentCount: creditCardPurchasesTable.installmentCount,
      amount: creditCardInstallmentsTable.amount,
      purchaseDate: transactionsTable.purchaseDate,
      postedDate: transactionsTable.postedDate,
    })
    .from(creditCardInstallmentsTable)
    .innerJoin(creditCardPurchasesTable, eq(creditCardPurchasesTable.id, creditCardInstallmentsTable.purchaseId))
    .innerJoin(transactionsTable, eq(transactionsTable.id, creditCardPurchasesTable.transactionId))
    .where(
      and(
        eq(creditCardInstallmentsTable.creditCardId, cardId),
        eq(creditCardInstallmentsTable.billingCycleId, cycleId),
      ),
    )
    .orderBy(asc(creditCardInstallmentsTable.installmentNumber), asc(creditCardInstallmentsTable.createdAt));
}

export async function listCreditCards(userId: string): Promise<CreditCardResponse[]> {
  await findUserCreditContext(userId);
  const cards = await listOwnedCreditCards(userId);
  return Promise.all(cards.map((card) => mapCreditCard(card)));
}

export async function createCreditCard(userId: string, dto: CreateCreditCardDto): Promise<CreditCardResponse> {
  const user = await findUserCreditContext(userId);
  await ensureCurrency(dto.currencyCode);

  const existing = await db
    .select({ id: accountsTable.id })
    .from(accountsTable)
    .where(and(eq(accountsTable.userId, userId), eq(accountsTable.name, dto.name)));

  if (existing[0]) {
    throw new ConflictError('An account with this name already exists');
  }

  const card = await db.transaction(async (tx) => {
    const [account] = await tx
      .insert(accountsTable)
      .values({
        userId,
        name: dto.name,
        institutionName: dto.institutionName,
        institutionDomain: dto.institutionDomain,
        notes: dto.notes,
        classification: 'liability',
        type: 'credit_card',
        currencyId: dto.currencyCode,
      })
      .returning();

    await tx.insert(ledgerAccountsTable).values({
      classification: 'liability',
      ownerType: 'account',
      ownerId: account.id,
      currencyId: account.currencyId,
    });

    const [createdCard] = await tx
      .insert(creditCardsTable)
      .values({
        userId,
        accountId: account.id,
        brand: dto.brand,
        productType: dto.productType,
        last4: dto.last4,
        color: dto.color,
        closingDay: dto.closingDay,
        dueDay: dto.dueDay,
      })
      .returning();

    const cardRow = {
      id: createdCard.id,
      accountId: account.id,
      userId,
      name: account.name,
      institutionName: account.institutionName ?? null,
      institutionDomain: account.institutionDomain ?? null,
      notes: account.notes ?? null,
      classification: 'liability',
      type: 'credit_card',
      currencyCode: account.currencyId,
      brand: createdCard.brand,
      productType: createdCard.productType,
      last4: createdCard.last4,
      color: createdCard.color ?? null,
      closingDay: createdCard.closingDay,
      dueDay: createdCard.dueDay,
      unappliedCreditAmount: createdCard.unappliedCreditAmount,
      createdAt: createdCard.createdAt,
      updatedAt: createdCard.updatedAt,
    } satisfies CreditCardRow;

    await ensureCurrentCycle(tx, cardRow, user.preferredTimezone);
    await syncCardCycles(tx, cardRow, user.preferredTimezone);

    return cardRow;
  });

  return mapCreditCard(card);
}

export async function getCreditCard(userId: string, creditCardId: string): Promise<CreditCardResponse> {
  const user = await findUserCreditContext(userId);

  await db.transaction(async (tx) => {
    const card = await findOwnedCreditCard(userId, creditCardId);
    await syncCardCycles(tx, card, user.preferredTimezone);
  });

  return mapCreditCard(await findOwnedCreditCard(userId, creditCardId));
}

export async function updateCreditCard(
  userId: string,
  creditCardId: string,
  dto: UpdateCreditCardDto,
): Promise<CreditCardResponse> {
  const user = await findUserCreditContext(userId);
  const existingCard = await findOwnedCreditCard(userId, creditCardId);

  if (dto.name && dto.name !== existingCard.name) {
    const duplicate = await db
      .select({ id: accountsTable.id })
      .from(accountsTable)
      .where(and(eq(accountsTable.userId, userId), eq(accountsTable.name, dto.name)));

    if (duplicate[0]) {
      throw new ConflictError('An account with this name already exists');
    }
  }

  const updated = await db.transaction(async (tx) => {
    if (dto.name !== undefined || dto.institutionName !== undefined || dto.institutionDomain !== undefined || dto.notes !== undefined) {
      await tx
        .update(accountsTable)
        .set({
          name: dto.name,
          institutionName: dto.institutionName === undefined ? undefined : dto.institutionName,
          institutionDomain: dto.institutionDomain === undefined ? undefined : dto.institutionDomain,
          notes: dto.notes === undefined ? undefined : dto.notes,
          updatedAt: new Date(),
        })
        .where(eq(accountsTable.id, existingCard.accountId));
    }

    await tx
      .update(creditCardsTable)
      .set({
        brand: dto.brand,
        productType: dto.productType,
        last4: dto.last4,
        color: dto.color === undefined ? undefined : dto.color,
        closingDay: dto.closingDay,
        dueDay: dto.dueDay,
        updatedAt: new Date(),
      })
      .where(eq(creditCardsTable.id, existingCard.id));

    const card: CreditCardRow = {
      ...existingCard,
      name: dto.name ?? existingCard.name,
      institutionName: dto.institutionName === undefined ? existingCard.institutionName : dto.institutionName,
      institutionDomain:
        dto.institutionDomain === undefined ? existingCard.institutionDomain : dto.institutionDomain,
      notes: dto.notes === undefined ? existingCard.notes : dto.notes,
      brand: dto.brand ?? existingCard.brand,
      productType: dto.productType ?? existingCard.productType,
      last4: dto.last4 ?? existingCard.last4,
      color: dto.color === undefined ? existingCard.color : dto.color,
      closingDay: dto.closingDay ?? existingCard.closingDay,
      dueDay: dto.dueDay ?? existingCard.dueDay,
      updatedAt: new Date(),
    };

    if (dto.closingDay !== undefined || dto.dueDay !== undefined) {
      await rebuildOpenAndFutureSchedules(tx, card, user.preferredTimezone);
    } else {
      await syncCardCycles(tx, card, user.preferredTimezone);
    }

    return card;
  });

  return mapCreditCard(updated);
}

export async function listBillingCycles(userId: string, creditCardId: string): Promise<CreditCardCycleSummary[]> {
  const user = await findUserCreditContext(userId);
  const card = await findOwnedCreditCard(userId, creditCardId);

  const cycles = await db.transaction(async (tx) => {
    await syncCardCycles(tx, card, user.preferredTimezone);
    return tx
      .select()
      .from(creditCardBillingCyclesTable)
      .where(eq(creditCardBillingCyclesTable.creditCardId, creditCardId))
      .orderBy(desc(creditCardBillingCyclesTable.closingDate));
  });

  return cycles.map((cycle) => mapCycleRow(cycle));
}

export async function getBillingCycle(
  userId: string,
  creditCardId: string,
  cycleId: string,
): Promise<CreditCardCycleDetailResponse> {
  const user = await findUserCreditContext(userId);
  const card = await findOwnedCreditCard(userId, creditCardId);

  const cycle = await db.transaction(async (tx) => {
    await syncCardCycles(tx, card, user.preferredTimezone);
    const rows = await tx
      .select()
      .from(creditCardBillingCyclesTable)
      .where(and(eq(creditCardBillingCyclesTable.id, cycleId), eq(creditCardBillingCyclesTable.creditCardId, creditCardId)));

    const row = rows[0];
    if (!row) throw new NotFoundError('Billing cycle');
    return row;
  });

  const items = await loadCycleItems(creditCardId, cycleId);
  return {
    cycle: mapCycleRow(cycle),
    items: items.map((item) => ({
      installmentId: item.installmentId,
      purchaseId: item.purchaseId,
      transactionId: item.transactionId,
      description: item.description,
      categoryId: item.categoryId ?? null,
      merchantId: item.merchantId ?? null,
      installmentNumber: item.installmentNumber,
      installmentCount: item.installmentCount,
      amount: item.amount,
      purchaseDate: formatDateOnly(item.purchaseDate),
      postedDate: formatDateOnly(item.postedDate),
    })),
  };
}

export async function updateBillingCycle(
  userId: string,
  creditCardId: string,
  cycleId: string,
  dto: UpdateCreditCardCycleDto,
): Promise<CreditCardCycleDetailResponse> {
  const user = await findUserCreditContext(userId);
  const card = await findOwnedCreditCard(userId, creditCardId);

  const cycle = await db.transaction(async (tx) => {
    await syncCardCycles(tx, card, user.preferredTimezone);

    const existingCycle = await findOwnedCycle(tx, creditCardId, cycleId);
    const closingDate = dto.closingDate ?? dto.periodEnd ?? existingCycle.closingDate;
    const periodEnd = dto.periodEnd ?? dto.closingDate ?? existingCycle.periodEnd;
    const periodStart = dto.periodStart ?? existingCycle.periodStart;
    const dueDate = dto.dueDate ?? existingCycle.dueDate;

    if (periodStart > periodEnd) {
      throw new ValidationError('periodStart must be on or before periodEnd');
    }

    if (closingDate.getTime() !== periodEnd.getTime()) {
      throw new ValidationError('closingDate and periodEnd must be the same date');
    }

    if (dueDate < closingDate) {
      throw new ValidationError('dueDate must be on or after closingDate');
    }

    await validateCycleWindowDoesNotOverlap(tx, creditCardId, cycleId, {
      periodStart,
      periodEnd,
    });

    const [updatedCycle] = await tx
      .update(creditCardBillingCyclesTable)
      .set({
        periodStart,
        periodEnd,
        closingDate,
        dueDate,
        updatedAt: new Date(),
      })
      .where(eq(creditCardBillingCyclesTable.id, cycleId))
      .returning();

    await syncCardCycles(tx, card, user.preferredTimezone);

    return updatedCycle;
  });

  const items = await loadCycleItems(creditCardId, cycleId);
  return {
    cycle: mapCycleRow(cycle),
    items: items.map((item) => ({
      installmentId: item.installmentId,
      purchaseId: item.purchaseId,
      transactionId: item.transactionId,
      description: item.description,
      categoryId: item.categoryId ?? null,
      merchantId: item.merchantId ?? null,
      installmentNumber: item.installmentNumber,
      installmentCount: item.installmentCount,
      amount: item.amount,
      purchaseDate: formatDateOnly(item.purchaseDate),
      postedDate: formatDateOnly(item.postedDate),
    })),
  };
}

export async function createPurchase(
  userId: string,
  creditCardId: string,
  dto: CreateCreditCardPurchaseDto,
): Promise<CreditCardPurchaseResponse> {
  const user = await findUserCreditContext(userId);
  const card = await findOwnedCreditCard(userId, creditCardId);
  await ensureExpenseCategory(userId, dto.categoryId);
  await ensureMerchant(userId, dto.merchantId);

  const paymentMethod = await resolveCreditCardPaymentMethod(card.currencyCode);
  const postedDate = dto.postedDate ?? dto.purchaseDate;

  const result = await db.transaction(async (tx) => {
    await syncCardCycles(tx, card, user.preferredTimezone);

    const transaction = await createUnderlyingExpenseTransaction(tx, {
      userId,
      card,
      paymentMethodId: paymentMethod.id,
      description: dto.description,
      amount: dto.amount,
      categoryId: dto.categoryId,
      merchantId: dto.merchantId,
      purchaseDate: dto.purchaseDate,
      postedDate,
    });

    const [purchase] = await tx
      .insert(creditCardPurchasesTable)
      .values({
        creditCardId: card.id,
        transactionId: transaction.id,
        purchaseAmount: dto.amount,
        installmentCount: dto.installmentCount,
        budgetExpenseTiming: user.creditExpenseTiming,
        budgetInstallmentMode: user.creditInstallmentBudgetMode,
      })
      .returning();

    const installments = await createInstallmentsForPurchase(
      tx,
      card,
      purchase.id,
      dto.purchaseDate,
      dto.amount,
      dto.installmentCount,
    );

    await recreateBudgetRecognitionsForPurchase(
      tx,
      purchase,
      {
        categoryId: dto.categoryId,
        currencyCode: card.currencyCode,
        purchaseDate: dto.purchaseDate,
      },
    );

    const syncedCycles = await syncCardCycles(tx, card, user.preferredTimezone);
    const cyclesById = new Map(syncedCycles.map((cycle) => [cycle.id, cycle]));

    return {
      purchase,
      transaction,
      installments: installments.map((installment) => {
        const cycle = cyclesById.get(installment.billingCycleId);
        if (!cycle) throw new NotFoundError('Billing cycle');
        return {
          installmentId: installment.id,
          installmentNumber: installment.installmentNumber,
          amount: installment.amount,
          billingCycleId: installment.billingCycleId,
          closingDate: cycle.closingDate,
          dueDate: cycle.dueDate,
        };
      }),
    };
  });

  return {
    purchaseId: result.purchase.id,
    creditCardId,
    transactionId: result.transaction.id,
    amount: dto.amount,
    installmentCount: dto.installmentCount,
    budgetExpenseTiming: result.purchase.budgetExpenseTiming,
    budgetInstallmentMode: result.purchase.budgetInstallmentMode,
    installments: result.installments.map((installment) => ({
      ...installment,
      closingDate: formatDateOnly(installment.closingDate),
      dueDate: formatDateOnly(installment.dueDate),
    })),
    createdAt: result.purchase.createdAt,
  };
}

export async function createPayment(
  userId: string,
  creditCardId: string,
  dto: CreateCreditCardPaymentDto,
): Promise<CreditCardPaymentResponse> {
  const user = await findUserCreditContext(userId);
  const card = await findOwnedCreditCard(userId, creditCardId);
  const sourceAccount = await baseTxRepository.findOwnedAccount(dto.fromAccountId, userId);

  if (!sourceAccount) throw new NotFoundError('Payment source account');
  if (sourceAccount.classification !== 'asset') {
    throw new ValidationError('Credit card payments must come from an asset account');
  }
  if (sourceAccount.type === 'credit_card') {
    throw new ValidationError('Credit card payments cannot come from another credit card account');
  }
  if (sourceAccount.currencyId !== card.currencyCode) {
    throw new ValidationError('Payment source account currency must match credit card currency');
  }

  const postedDate = dto.postedDate ?? dto.paymentDate;

  const result = await db.transaction(async (tx) => {
    const syncedCycles = await syncCardCycles(tx, card, user.preferredTimezone);
    const payableCycles = [...syncedCycles]
      .filter((cycle) => cycle.remainingAmount > 0)
      .sort((left, right) => left.dueDate.getTime() - right.dueDate.getTime());

    const transaction = await createUnderlyingPaymentTransaction(tx, {
      userId,
      card,
      fromAccountId: dto.fromAccountId,
      description: dto.description ?? `Payment to ${card.name}`,
      amount: dto.amount,
      paymentDate: dto.paymentDate,
      postedDate,
    });

    const [payment] = await tx
      .insert(creditCardPaymentsTable)
      .values({
        creditCardId: card.id,
        transactionId: transaction.id,
        amount: dto.amount,
      })
      .returning();

    let remainingAmount = dto.amount;
    const allocations: Array<{ billingCycleId: string | null; amount: number }> = [];

    for (const cycle of payableCycles) {
      if (remainingAmount <= 0) break;
      const allocatedAmount = Math.min(cycle.remainingAmount, remainingAmount);
      if (allocatedAmount <= 0) continue;

      await tx.insert(creditCardPaymentAllocationsTable).values({
        paymentId: payment.id,
        billingCycleId: cycle.id,
        amount: allocatedAmount,
      });

      allocations.push({
        billingCycleId: cycle.id,
        amount: allocatedAmount,
      });
      remainingAmount -= allocatedAmount;
    }

    if (remainingAmount > 0) {
      const [updatedCard] = await tx
        .update(creditCardsTable)
        .set({
          unappliedCreditAmount: sql`${creditCardsTable.unappliedCreditAmount} + ${remainingAmount}`,
          updatedAt: new Date(),
        })
        .where(eq(creditCardsTable.id, card.id))
        .returning({
          unappliedCreditAmount: creditCardsTable.unappliedCreditAmount,
        });

      allocations.push({
        billingCycleId: null,
        amount: remainingAmount,
      });

      card.unappliedCreditAmount = updatedCard.unappliedCreditAmount;
    }

    await syncCardCycles(tx, card, user.preferredTimezone);

    return {
      payment,
      transaction,
      allocations,
      unappliedCreditAmount: card.unappliedCreditAmount,
    };
  });

  return {
    paymentId: result.payment.id,
    creditCardId,
    transactionId: result.transaction.id,
    amount: dto.amount,
    fromAccountId: dto.fromAccountId,
    allocations: result.allocations,
    unappliedCreditAmount: result.unappliedCreditAmount,
    createdAt: result.payment.createdAt,
  };
}

export async function getForecast(
  userId: string,
  creditCardId: string,
  query: CreditCardForecastQuery,
): Promise<CreditCardForecastResponse> {
  const user = await findUserCreditContext(userId);
  const card = await findOwnedCreditCard(userId, creditCardId);
  const forecastStart = query.fromMonth ? parseMonthKey(query.fromMonth) : monthStart(getTodayInTimezone(user.preferredTimezone));
  const forecastEnd = addMonths(forecastStart, query.months - 1);

  await db.transaction(async (tx) => {
    await syncCardCycles(tx, card, user.preferredTimezone);

    let latestCycle = (
      await tx
        .select()
        .from(creditCardBillingCyclesTable)
        .where(eq(creditCardBillingCyclesTable.creditCardId, card.id))
        .orderBy(desc(creditCardBillingCyclesTable.closingDate))
    )[0];

    while (!latestCycle || monthStart(latestCycle.dueDate) < forecastEnd) {
      const baseClosingDate =
        latestCycle?.closingDate ?? buildCycleForPurchaseDate(getTodayInTimezone(user.preferredTimezone), card.closingDay, card.dueDay).closingDate;
      const nextCycle = await ensureCycleForClosingDate(tx, card, addMonths(baseClosingDate, 1));
      latestCycle = nextCycle;
    }

    await syncCardCycles(tx, card, user.preferredTimezone);
  });

  const cycles = await db
    .select()
    .from(creditCardBillingCyclesTable)
    .where(eq(creditCardBillingCyclesTable.creditCardId, card.id))
    .orderBy(asc(creditCardBillingCyclesTable.dueDate));

  const filteredCycles = cycles.filter((cycle) => {
    const dueMonth = monthStart(cycle.dueDate);
    return dueMonth >= forecastStart && dueMonth <= forecastEnd;
  });

  const cycleItems = await Promise.all(
    filteredCycles.map(async (cycle) => ({
      cycle,
      items: await loadCycleItems(card.id, cycle.id),
    })),
  );

  return {
    creditCardId,
    fromMonth: formatMonthKey(forecastStart),
    months: query.months,
    unappliedCreditAmount: (await findOwnedCreditCard(userId, creditCardId)).unappliedCreditAmount,
    cycles: cycleItems.map(({ cycle, items }) => ({
      ...mapCycleRow(cycle),
      items: items.map((item) => ({
        installmentId: item.installmentId,
        purchaseId: item.purchaseId,
        transactionId: item.transactionId,
        description: item.description,
        categoryId: item.categoryId ?? null,
        merchantId: item.merchantId ?? null,
        installmentNumber: item.installmentNumber,
        installmentCount: item.installmentCount,
        amount: item.amount,
        purchaseDate: formatDateOnly(item.purchaseDate),
        postedDate: formatDateOnly(item.postedDate),
      })),
    })),
  };
}
