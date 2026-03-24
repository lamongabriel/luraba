import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { billingCyclesTable } from '@/db/schemas/billing-cycles.schema';
import { creditCardsTable } from '@/db/schemas/credit-cards.schema';
import { entriesTable } from '@/db/schemas/entries.schema';
import { ledgerAccountsTable } from '@/db/schemas/ledger-accounts.schema';
import { NotFoundError } from '@/shared/errors';
import * as creditCardsRepository from './credit-cards.repository';
import { CreateCreditCardDto, CreditCard } from './credit-cards.types';

interface CardOverview {
  card: CreditCard;
  limit: {
    total: bigint;
    used: bigint;
    available: bigint;
  };
  cycles: (typeof billingCyclesTable.$inferSelect)[];
}

function clampDay(year: number, monthIndex: number, day: number): Date {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return new Date(Date.UTC(year, monthIndex, Math.min(day, lastDay)));
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function monthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export async function generateBillingCycles(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  cardId: number,
  closingDay: number,
  dueDay: number,
  graceDays: number,
  monthsAhead = 12,
): Promise<void> {
  const now = new Date();
  const firstMonth = monthStart(now);
  const cyclesToInsert: Array<typeof billingCyclesTable.$inferInsert> = [];

  for (let i = 0; i < monthsAhead; i += 1) {
    const cycleMonth = new Date(Date.UTC(firstMonth.getUTCFullYear(), firstMonth.getUTCMonth() + i, 1));

    const year = cycleMonth.getUTCFullYear();
    const month = cycleMonth.getUTCMonth();

    const closingDate = clampDay(year, month, closingDay);
    const previousClosing = clampDay(year, month - 1, closingDay);
    const startDate = addDays(previousClosing, 1);
    const endDate = closingDate;

    const dueBase = clampDay(year, month + 1, dueDay);
    const dueDate = addDays(dueBase, graceDays);

    const status: 'open' | 'future' = now <= closingDate ? 'open' : 'future';

    cyclesToInsert.push({
      creditCardId: cardId,
      startDate,
      endDate,
      closingDate,
      dueDate,
      status,
    });
  }

  if (cyclesToInsert.length === 0) return;

  await tx.insert(billingCyclesTable).values(cyclesToInsert).onConflictDoNothing();
}

export async function createCreditCard(userId: number, dto: CreateCreditCardDto): Promise<CreditCard> {
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

    await generateBillingCycles(tx, card.id, card.closingDay, card.dueDay, card.graceDays, 12);

    return card;
  });
}

export async function getCardOverview(cardId: number, userId: number): Promise<CardOverview> {
  const card = await creditCardsRepository.findOwnedCreditCard(cardId, userId);
  if (!card) throw new NotFoundError('Credit card');

  const [usage] = await db
    .select({
      used: sql<bigint>`coalesce(sum(${entriesTable.amount}), 0)::bigint`,
    })
    .from(entriesTable)
    .innerJoin(ledgerAccountsTable, eq(ledgerAccountsTable.id, entriesTable.ledgerAccountId))
    .where(
      and(
        eq(ledgerAccountsTable.ownerType, 'credit_card'),
        eq(ledgerAccountsTable.ownerId, card.id),
        eq(entriesTable.currencyId, card.currencyId),
      ),
    );

  const usedRaw = usage?.used ?? 0n;
  const used = usedRaw > 0n ? usedRaw : 0n;
  const available = card.limitAmount - used;
  const cycles = await creditCardsRepository.listCyclesByCard(card.id);

  return {
    card,
    limit: {
      total: card.limitAmount,
      used,
      available,
    },
    cycles,
  };
}