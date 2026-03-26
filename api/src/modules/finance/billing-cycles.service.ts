import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '@/db';
import { billingCyclesTable } from '@/db/schemas/billing-cycles.schema';
import { entriesTable } from '@/db/schemas/entries.schema';
import { addDays, clampDay, monthStart } from './finance.helpers';

export type FinanceDbExecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

function inferCycleSeedStatus(
  cycle: {
    startDate: Date;
    closingDate: Date;
    dueDate: Date;
  },
  asOfDate: Date,
): 'future' | 'open' | 'closed' | 'due' {
  if (asOfDate < cycle.startDate) return 'future';
  if (asOfDate <= cycle.closingDate) return 'open';
  if (asOfDate < cycle.dueDate) return 'closed';
  return 'due';
}

export async function ensureBillingCycleWindow(
  executor: FinanceDbExecutor,
  card: {
    id: string;
    closingDay: number;
    dueDay: number;
    graceDays: number;
  },
  asOfDate: Date,
  monthsBack = 2,
  monthsAhead = 12,
): Promise<void> {
  const anchor = monthStart(asOfDate);
  const startMonth = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - monthsBack, 1));
  const endMonth = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + monthsAhead, 1));

  const existingCycles = await executor
    .select({ startDate: billingCyclesTable.startDate })
    .from(billingCyclesTable)
    .where(
      and(
        eq(billingCyclesTable.creditCardId, card.id),
        gte(billingCyclesTable.startDate, startMonth),
        lte(billingCyclesTable.startDate, endMonth),
      ),
    );

  const existingStarts = new Set(existingCycles.map((cycle) => cycle.startDate.toISOString()));
  const cyclesToInsert: Array<typeof billingCyclesTable.$inferInsert> = [];

  for (let offset = -monthsBack; offset <= monthsAhead; offset += 1) {
    const cycleMonth = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + offset, 1));
    const year = cycleMonth.getUTCFullYear();
    const monthIndex = cycleMonth.getUTCMonth();
    const closingDate = clampDay(year, monthIndex, card.closingDay);
    const previousClosing = clampDay(year, monthIndex - 1, card.closingDay);
    const startDate = addDays(previousClosing, 1);

    if (existingStarts.has(startDate.toISOString())) {
      continue;
    }

    const dueBase = clampDay(year, monthIndex + 1, card.dueDay);
    const dueDate = addDays(dueBase, card.graceDays);

    cyclesToInsert.push({
      creditCardId: card.id,
      startDate,
      endDate: closingDate,
      closingDate,
      dueDate,
      status: inferCycleSeedStatus(
        {
          startDate,
          closingDate,
          dueDate,
        },
        new Date(),
      ),
    });
  }

  if (cyclesToInsert.length === 0) return;

  await executor.insert(billingCyclesTable).values(cyclesToInsert).onConflictDoNothing();
}

export async function getCycleOutstanding(
  executor: FinanceDbExecutor,
  cardLedgerId: string,
  billingCycleId: string,
): Promise<bigint> {
  const [summary] = await executor
    .select({
      total: sql<bigint>`coalesce(sum(${entriesTable.amount}), 0)::bigint`,
    })
    .from(entriesTable)
    .where(and(eq(entriesTable.ledgerAccountId, cardLedgerId), eq(entriesTable.billingCycleId, billingCycleId)));

  const signedTotal = summary?.total ?? 0n;
  return signedTotal < 0n ? -signedTotal : 0n;
}
