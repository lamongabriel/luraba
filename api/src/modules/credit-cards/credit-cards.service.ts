import { and, asc, eq, gt, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { billingCyclesTable } from '@/db/schemas/billing-cycles.schema';
import { cardPaymentsTable } from '@/db/schemas/card-payments.schema';
import { creditCardsTable } from '@/db/schemas/credit-cards.schema';
import { entriesTable } from '@/db/schemas/entries.schema';
import { installmentItemsTable } from '@/db/schemas/installment-items.schema';
import { installmentsTable } from '@/db/schemas/installments.schema';
import { ledgerAccountsTable } from '@/db/schemas/ledger-accounts.schema';
import { transactionsTable } from '@/db/schemas/transactions.schema';
import { ensureBillingCycleWindow, getCycleOutstanding } from '@/modules/finance/billing-cycles.service';
import { deriveBillingCycleStatus } from '@/modules/finance/finance.helpers';
import { NotFoundError } from '@/shared/errors';
import * as creditCardsRepository from './credit-cards.repository';
import { CreateCreditCardDto, CreditCard } from './credit-cards.types';

type CycleOverview = {
  id: string;
  startDate: Date;
  endDate: Date;
  closingDate: Date;
  dueDate: Date;
  status: 'future' | 'open' | 'closed' | 'due' | 'paid';
  totals: {
    purchases: bigint;
    installments: bigint;
    payments: bigint;
    outstanding: bigint;
  };
  items: Array<{
    entryId: string;
    transactionId: string;
    type: 'card_purchase' | 'installment';
    description: string;
    amount: bigint;
    categoryId: string | null;
    purchaseDate: Date;
    postedDate: Date;
  }>;
  payments: Array<{
    transactionId: string;
    amount: bigint;
    description: string;
    purchaseDate: Date;
    postedDate: Date;
  }>;
  installmentSchedule: Array<{
    installmentId: string;
    installmentItemId: string;
    amount: bigint;
    totalAmount: bigint;
    count: number;
    transactionId: string;
    description: string;
    purchaseDate: Date;
  }>;
};

interface CardOverview {
  card: CreditCard;
  limit: {
    total: bigint;
    used: bigint;
    available: bigint;
  };
  currentCycle: CycleOverview | null;
  pastCycles: CycleOverview[];
  futureCycles: CycleOverview[];
  cycles: CycleOverview[];
}

async function findCardLedger(cardId: string): Promise<{
  id: string;
  currencyId: string;
} | undefined> {
  const rows = await db
    .select({
      id: ledgerAccountsTable.id,
      currencyId: ledgerAccountsTable.currencyId,
    })
    .from(ledgerAccountsTable)
    .where(and(eq(ledgerAccountsTable.ownerType, 'credit_card'), eq(ledgerAccountsTable.ownerId, cardId)));

  return rows[0];
}

export async function createCreditCard(userId: string, dto: CreateCreditCardDto): Promise<CreditCard> {
  const user = await creditCardsRepository.findUserById(userId);
  if (!user) throw new NotFoundError('User');

  const currency = await creditCardsRepository.findCurrencyById(dto.currencyId);
  if (!currency) throw new NotFoundError('Currency');

  const account = await creditCardsRepository.findOwnedAccount(dto.accountId, userId);
  if (!account) throw new NotFoundError('Account');

  return db.transaction(async (tx) => {
    const rows = await tx
      .insert(creditCardsTable)
      .values({
        accountId: dto.accountId,
        name: dto.name,
        brand: dto.brand,
        last4: dto.last4,
        limitAmount: dto.limitAmount,
        currencyId: dto.currencyId,
        closingDay: dto.closingDay,
        dueDay: dto.dueDay,
        graceDays: dto.graceDays,
      })
      .returning();

    const card = rows[0];

    await tx.insert(ledgerAccountsTable).values({
      type: 'liability',
      ownerType: 'credit_card',
      ownerId: card.id,
      currencyId: card.currencyId,
    });

    await ensureBillingCycleWindow(tx, card, new Date(), 2, 12);

    return card;
  });
}

export async function getCardOverview(cardId: string, userId: string): Promise<CardOverview> {
  const card = await creditCardsRepository.findOwnedCreditCard(cardId, userId);
  if (!card) throw new NotFoundError('Credit card');

  await ensureBillingCycleWindow(db, card, new Date(), 2, 12);

  const cardLedger = await findCardLedger(card.id);
  if (!cardLedger) throw new NotFoundError('Credit card ledger');

  const cycles = await creditCardsRepository.listCyclesByCard(card.id);
  const cycleIds = cycles.map((cycle) => cycle.id);

  const [usageRow] = await db
    .select({
      total: sql<bigint>`coalesce(sum(${entriesTable.amount}), 0)::bigint`,
    })
    .from(entriesTable)
    .where(eq(entriesTable.ledgerAccountId, cardLedger.id));

  // Always convert usageRow.total and card.limitAmount to BigInt for arithmetic
  const totalRaw = usageRow?.total ?? 0;
  const totalBigInt = typeof totalRaw === 'bigint' ? totalRaw : BigInt(totalRaw);
  const used = totalBigInt < 0n ? -totalBigInt : 0n;
  const available = BigInt(card.limitAmount) - used;

  const itemRows =
    cycleIds.length === 0
      ? []
      : await db
          .select({
            entryId: entriesTable.id,
            transactionId: transactionsTable.id,
            billingCycleId: entriesTable.billingCycleId,
            amount: entriesTable.amount,
            categoryId: entriesTable.categoryId,
            type: transactionsTable.type,
            description: transactionsTable.description,
            purchaseDate: transactionsTable.purchaseDate,
            postedDate: transactionsTable.postedDate,
          })
          .from(entriesTable)
          .innerJoin(transactionsTable, eq(transactionsTable.id, entriesTable.transactionId))
          .where(
            and(
              inArray(entriesTable.billingCycleId, cycleIds),
              gt(entriesTable.amount, 0n),
              inArray(transactionsTable.type, ['card_purchase', 'installment']),
            ),
          )
          .orderBy(asc(transactionsTable.purchaseDate), asc(transactionsTable.id), asc(entriesTable.id));

  const paymentRows =
    cycleIds.length === 0
      ? []
      : await db
          .select({
            transactionId: cardPaymentsTable.transactionId,
            billingCycleId: cardPaymentsTable.billingCycleId,
            amount: cardPaymentsTable.amount,
            description: transactionsTable.description,
            purchaseDate: transactionsTable.purchaseDate,
            postedDate: transactionsTable.postedDate,
          })
          .from(cardPaymentsTable)
          .innerJoin(transactionsTable, eq(transactionsTable.id, cardPaymentsTable.transactionId))
          .where(inArray(cardPaymentsTable.billingCycleId, cycleIds))
          .orderBy(asc(transactionsTable.purchaseDate), asc(transactionsTable.id));

  const installmentScheduleRows = await db
    .select({
      installmentId: installmentItemsTable.installmentId,
      installmentItemId: installmentItemsTable.id,
      billingCycleId: installmentItemsTable.billingCycleId,
      amount: installmentItemsTable.amount,
      totalAmount: installmentsTable.totalAmount,
      count: installmentsTable.count,
      transactionId: installmentsTable.transactionId,
      description: transactionsTable.description,
      purchaseDate: transactionsTable.purchaseDate,
    })
    .from(installmentItemsTable)
    .innerJoin(installmentsTable, eq(installmentsTable.id, installmentItemsTable.installmentId))
    .innerJoin(transactionsTable, eq(transactionsTable.id, installmentsTable.transactionId))
    .where(eq(installmentsTable.creditCardId, card.id))
    .orderBy(asc(installmentItemsTable.billingCycleId), asc(installmentItemsTable.id));

  const itemsByCycle = new Map<string, CycleOverview['items']>();
  const paymentsByCycle = new Map<string, CycleOverview['payments']>();
  const installmentScheduleByCycle = new Map<string, CycleOverview['installmentSchedule']>();

  for (const row of itemRows) {
    const cycleId = row.billingCycleId;
    if (!cycleId) continue;

    const items = itemsByCycle.get(cycleId) ?? [];
    items.push({
      entryId: row.entryId,
      transactionId: row.transactionId,
      type: row.type,
      description: row.description,
      amount: row.amount,
      categoryId: row.categoryId,
      purchaseDate: row.purchaseDate,
      postedDate: row.postedDate,
    });
    itemsByCycle.set(cycleId, items);
  }

  for (const row of paymentRows) {
    const payments = paymentsByCycle.get(row.billingCycleId) ?? [];
    payments.push({
      transactionId: row.transactionId,
      amount: row.amount,
      description: row.description,
      purchaseDate: row.purchaseDate,
      postedDate: row.postedDate,
    });
    paymentsByCycle.set(row.billingCycleId, payments);
  }

  for (const row of installmentScheduleRows) {
    const items = installmentScheduleByCycle.get(row.billingCycleId) ?? [];
    items.push({
      installmentId: row.installmentId,
      installmentItemId: row.installmentItemId,
      amount: row.amount,
      totalAmount: row.totalAmount,
      count: row.count,
      transactionId: row.transactionId,
      description: row.description,
      purchaseDate: row.purchaseDate,
    });
    installmentScheduleByCycle.set(row.billingCycleId, items);
  }

  const cycleOverviews: CycleOverview[] = [];

  for (const cycle of cycles) {
    const items = itemsByCycle.get(cycle.id) ?? [];
    const payments = paymentsByCycle.get(cycle.id) ?? [];
    const installmentSchedule = installmentScheduleByCycle.get(cycle.id) ?? [];
    const outstanding = await getCycleOutstanding(db, cardLedger.id, cycle.id);
    const status = deriveBillingCycleStatus(cycle, outstanding, new Date());

    cycleOverviews.push({
      id: cycle.id,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      closingDate: cycle.closingDate,
      dueDate: cycle.dueDate,
      status,
      totals: {
        purchases: items
          .filter((item) => item.type === 'card_purchase')
          .reduce((total, item) => total + item.amount, 0n),
        installments: items
          .filter((item) => item.type === 'installment')
          .reduce((total, item) => total + item.amount, 0n),
        payments: payments.reduce((total, payment) => total + payment.amount, 0n),
        outstanding,
      },
      items,
      payments,
      installmentSchedule,
    });
  }

  const now = new Date();
  const currentCycle =
    cycleOverviews.find((cycle) => cycle.status === 'open') ??
    cycleOverviews.find((cycle) => cycle.status === 'closed' || cycle.status === 'due') ??
    null;

  const futureCycles = cycleOverviews.filter((cycle) => cycle.status === 'future');
  const pastCycles = cycleOverviews.filter((cycle) => cycle.id !== currentCycle?.id && cycle.status !== 'future');

  return {
    card,
    limit: {
      total: card.limitAmount,
      used,
      available,
    },
    currentCycle,
    pastCycles,
    futureCycles,
  };
}
