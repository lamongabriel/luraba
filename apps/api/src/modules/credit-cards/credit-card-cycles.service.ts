import { and, asc, desc, eq, gte, inArray, lt, lte, sql } from "drizzle-orm";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";
import { creditCardBillingCyclesTable } from "@/db/schemas/credit-card-billing-cycles.schema";
import { creditCardBudgetRecognitionsTable } from "@/db/schemas/credit-card-budget-recognitions.schema";
import { creditCardInstallmentsTable } from "@/db/schemas/credit-card-installments.schema";
import { creditCardPurchasesTable } from "@/db/schemas/credit-card-purchases.schema";
import { creditCardsTable } from "@/db/schemas/credit-cards.schema";
import { householdsTable } from "@/db/schemas/households.schema";
import { transactionsTable } from "@/db/schemas/transactions.schema";
import type { TxClient } from "@/db/types";
import { ConflictError, NotFoundError, ValidationError } from "@/shared/errors";
import {
  addDays,
  addMonths,
  buildCycleForPurchaseDate,
  buildCycleFromClosingDate,
  formatMonthKey,
  getTodayInTimezone,
  isAfter,
  now,
  parseMonthKey,
  startOfMonth,
} from "@/shared/lib/date";
import { createListMeta, type ListResult } from "@/shared/list";
import {
  deriveCycleDisplayStatus,
  getNextCycleShapeFromPeriodStart,
  getNextPeriodStart,
  hasCycleActivity,
} from "./credit-card-cycle-engine";
import * as cycleRepository from "./credit-card-cycles.repository";
import {
  type CreditCardRow,
  mapCycleItems,
  mapCycleRow,
  splitInstallmentAmounts,
} from "./credit-cards.helpers";
import type { ListCreditCardCyclesQuery } from "./credit-cards.query";
import * as creditCardsRepository from "./credit-cards.repository";
import type {
  CreditCardCycleDetailResponse,
  CreditCardCycleSummary,
  CreditCardForecastQuery,
  CreditCardForecastResponse,
  UpdateCreditCardCycleDto,
} from "./credit-cards.types";

async function findCreditCardCycle(
  tx: TxClient,
  creditCardId: string,
  cycleId: string,
): Promise<typeof creditCardBillingCyclesTable.$inferSelect> {
  const cycle = await cycleRepository.findCycleById(tx, creditCardId, cycleId);
  if (!cycle) throw new NotFoundError("Billing cycle");
  return cycle;
}

export async function ensureCycleForClosingDate(
  tx: TxClient,
  card: CreditCardRow,
  closingDate: Date,
) {
  const cycleShape = buildCycleFromClosingDate(closingDate, card.closingDay, card.dueDay);
  const existing = await cycleRepository.findCycleByPeriodStart(
    tx,
    card.id,
    cycleShape.periodStart,
  );

  if (existing) {
    return existing;
  }

  return cycleRepository.insertCycle(tx, {
    creditCardId: card.id,
    periodStart: cycleShape.periodStart,
    periodEnd: cycleShape.periodEnd,
    closingDate: cycleShape.closingDate,
    dueDate: cycleShape.dueDate,
    status: "open",
    statementAmount: 0,
    paidAmount: 0,
    remainingAmount: 0,
  });
}

async function ensureCycleForDate(tx: TxClient, card: CreditCardRow, date: Date) {
  const existing = await cycleRepository.findCycleContainingDate(tx, card.id, date);
  if (existing) {
    return existing;
  }

  const cycleShape = buildCycleForPurchaseDate(date, card.closingDay, card.dueDay);
  return ensureCycleForClosingDate(tx, card, cycleShape.closingDate);
}

async function ensureNextCycleAfter(
  tx: TxClient,
  card: CreditCardRow,
  cycle: typeof creditCardBillingCyclesTable.$inferSelect,
) {
  const periodStart = getNextPeriodStart(cycle.periodEnd);
  const existing = await cycleRepository.findCycleByPeriodStart(tx, card.id, periodStart);
  if (existing) {
    return existing;
  }

  const nextCycleShape = getNextCycleShapeFromPeriodStart(
    periodStart,
    card.closingDay,
    card.dueDay,
  );
  return cycleRepository.insertCycle(tx, {
    creditCardId: card.id,
    periodStart: nextCycleShape.periodStart,
    periodEnd: nextCycleShape.periodEnd,
    closingDate: nextCycleShape.closingDate,
    dueDate: nextCycleShape.dueDate,
    status: "open",
    statementAmount: 0,
    paidAmount: 0,
    remainingAmount: 0,
  });
}

export async function ensureCurrentCycle(tx: TxClient, card: CreditCardRow, timezone: string) {
  const today = getTodayInTimezone(timezone);
  return ensureCycleForDate(tx, card, today);
}

async function ensureCurrentAndNextCycle(tx: TxClient, card: CreditCardRow, timezone: string) {
  const currentCycle = await ensureCurrentCycle(tx, card, timezone);
  await ensureNextCycleAfter(tx, card, currentCycle);
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
    .where(
      and(
        eq(creditCardBillingCyclesTable.creditCardId, cardId),
        sql`${creditCardBillingCyclesTable.id} <> ${cycleId}`,
      ),
    );

  const overlappingCycle = otherCycles.find(
    (cycle) => candidate.periodStart <= cycle.periodEnd && cycle.periodStart <= candidate.periodEnd,
  );

  if (overlappingCycle) {
    throw new ValidationError(
      "Billing cycle dates cannot overlap with another billing cycle on this credit card",
    );
  }
}

export async function createInstallmentsForPurchase(
  tx: TxClient,
  card: CreditCardRow,
  purchaseId: string,
  purchaseDate: Date,
  totalAmount: number,
  installmentCount: number,
  startInstallmentNumber = 1,
): Promise<Array<typeof creditCardInstallmentsTable.$inferSelect>> {
  const amounts = splitInstallmentAmounts(totalAmount, installmentCount);
  const createdRows: Array<typeof creditCardInstallmentsTable.$inferSelect> = [];

  let cycle = await ensureCycleForDate(tx, card, purchaseDate);

  for (
    let installmentNumber = 2;
    installmentNumber <= startInstallmentNumber;
    installmentNumber += 1
  ) {
    cycle = await ensureNextCycleAfter(tx, card, cycle);
  }

  for (
    let installmentNumber = startInstallmentNumber;
    installmentNumber <= installmentCount;
    installmentNumber += 1
  ) {
    const created = await tx
      .insert(creditCardInstallmentsTable)
      .values({
        creditCardId: card.id,
        purchaseId,
        billingCycleId: cycle.id,
        installmentNumber,
        amount: amounts[installmentNumber - 1],
      })
      .returning();

    createdRows.push(created[0]);

    if (installmentNumber < installmentCount) {
      cycle = await ensureNextCycleAfter(tx, card, cycle);
    }
  }

  return createdRows;
}

export async function recreateBudgetRecognitionsForPurchase(
  tx: TxClient,
  purchase: {
    id: string;
    purchaseAmount: number;
    installmentCount: number;
    budgetExpenseTiming: "spend_month" | "payment_month";
    budgetInstallmentMode: "per_installment" | "full_amount";
  },
  params: {
    categoryId: string | null;
    currencyCode: string;
    purchaseDate: Date;
    currentMonthStart?: Date;
  },
): Promise<void> {
  if (!params.categoryId) return;
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

  if (purchase.budgetInstallmentMode === "per_installment") {
    for (const installment of installments) {
      const budgetMonth =
        purchase.budgetExpenseTiming === "spend_month"
          ? startOfMonth(installment.closingDate)
          : startOfMonth(installment.dueDate);

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
      purchase.budgetExpenseTiming === "spend_month"
        ? startOfMonth(params.purchaseDate)
        : startOfMonth(firstInstallment?.dueDate ?? params.purchaseDate);

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

export async function syncCardCycles(
  tx: TxClient,
  card: CreditCardRow,
  timezone: string,
): Promise<Array<typeof creditCardBillingCyclesTable.$inferSelect>> {
  await ensureCurrentCycle(tx, card, timezone);

  const [cycles, installmentSums, allocationSums] = await Promise.all([
    cycleRepository.listCyclesByCardId(tx, card.id),
    cycleRepository.listInstallmentTotals(tx, card.id),
    cycleRepository.listPaymentAllocationTotals(tx, card.id),
  ]);

  const today = getTodayInTimezone(timezone);
  const installmentTotals = new Map(installmentSums.map((row) => [row.billingCycleId, row.amount]));
  const paymentTotals = new Map(
    allocationSums.map((row) => [row.billingCycleId ?? "", row.amount]),
  );

  const updatedCycles: Array<typeof creditCardBillingCyclesTable.$inferSelect> = [];

  for (const cycle of cycles) {
    const statementAmount = installmentTotals.get(cycle.id) ?? 0;
    const paidAmount = paymentTotals.get(cycle.id) ?? 0;
    const remainingAmount = Math.max(statementAmount - paidAmount, 0);

    const status =
      remainingAmount === 0 && cycle.closingDate <= today
        ? "paid"
        : cycle.closingDate < today
          ? "closed"
          : "open";

    const updated = await cycleRepository.updateCycle(tx, cycle.id, {
      statementAmount,
      paidAmount,
      remainingAmount,
      status,
      updatedAt: now(),
    });

    if (!updated) throw new NotFoundError("Billing cycle");
    updatedCycles.push(updated);
  }

  return updatedCycles;
}

async function rebuildSchedulesFromClosingDate(
  tx: TxClient,
  card: CreditCardRow,
  timezone: string,
  fromClosingDate: Date,
): Promise<void> {
  const today = getTodayInTimezone(timezone);
  const currentMonthStart = startOfMonth(today);

  const purchaseRows = await tx
    .select({
      purchaseId: creditCardPurchasesTable.id,
      purchaseAmount: creditCardPurchasesTable.purchaseAmount,
      installmentCount: creditCardPurchasesTable.installmentCount,
      includeInBudget: creditCardPurchasesTable.includeInBudget,
      budgetExpenseTiming: creditCardPurchasesTable.budgetExpenseTiming,
      budgetInstallmentMode: creditCardPurchasesTable.budgetInstallmentMode,
      transactionId: creditCardPurchasesTable.transactionId,
      categoryId: transactionsTable.categoryId,
      postedDate: transactionsTable.postedDate,
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

  const affectedCycles = await tx
    .select({
      id: creditCardBillingCyclesTable.id,
      closingDate: creditCardBillingCyclesTable.closingDate,
    })
    .from(creditCardBillingCyclesTable)
    .where(
      and(
        eq(creditCardBillingCyclesTable.creditCardId, card.id),
        gte(creditCardBillingCyclesTable.closingDate, fromClosingDate),
      ),
    );

  const affectedCycleIds = affectedCycles.map((cycle) => cycle.id);
  await cycleRepository.deleteInstallmentsByCycleIds(tx, affectedCycleIds);

  for (const purchase of purchaseRows) {
    if (!purchase.categoryId) continue;

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
          lt(creditCardBillingCyclesTable.closingDate, fromClosingDate),
        ),
      )
      .orderBy(desc(creditCardInstallmentsTable.installmentNumber));

    const nextInstallmentNumber = (preservedInstallments[0]?.installmentNumber ?? 0) + 1;
    if (nextInstallmentNumber <= purchase.installmentCount) {
      await createInstallmentsForPurchase(
        tx,
        card,
        purchase.purchaseId,
        purchase.postedDate,
        purchase.purchaseAmount,
        purchase.installmentCount,
        nextInstallmentNumber,
      );
    }

    if (purchase.includeInBudget) {
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
          categoryId: purchase.categoryId,
          currencyCode: card.currencyCode,
          purchaseDate: purchase.postedDate,
          currentMonthStart,
        },
      );
    }
  }

  await syncCardCycles(tx, card, timezone);
}

export async function rebuildOpenAndFutureSchedules(
  tx: TxClient,
  card: CreditCardRow,
  timezone: string,
): Promise<void> {
  const today = getTodayInTimezone(timezone);
  await rebuildSchedulesFromClosingDate(tx, card, timezone, today);
}

function enrichCycleSummaries(
  cycles: Array<typeof creditCardBillingCyclesTable.$inferSelect>,
  timezone: string,
): CreditCardCycleSummary[] {
  const today = getTodayInTimezone(timezone);
  const currentCycleId = cycles.find(
    (cycle) => cycle.periodStart <= today && cycle.periodEnd >= today,
  )?.id;
  const nextCycleId = [...cycles]
    .filter((cycle) => cycle.periodStart > today)
    .sort((left, right) => (left.periodStart < right.periodStart ? -1 : 1))[0]?.id;

  return cycles.map((cycle) => ({
    ...mapCycleRow(cycle),
    displayStatus: deriveCycleDisplayStatus(cycle, today),
    isCurrent: cycle.id === currentCycleId,
    isNext: cycle.id === nextCycleId,
    hasActivity: hasCycleActivity(cycle),
  }));
}

export async function listBillingCycles(
  context: HouseholdContext,
  creditCardId: string,
  query: ListCreditCardCyclesQuery,
): Promise<ListResult<CreditCardCycleSummary>> {
  const card = await creditCardsRepository.findByIdOrThrow(context.householdId, creditCardId);

  await db.transaction(async (tx) => {
    await ensureCurrentAndNextCycle(tx, card, context.timezone);
    await syncCardCycles(tx, card, context.timezone);
  });

  const page = await cycleRepository.listCyclesPage(
    creditCardId,
    query,
    getTodayInTimezone(context.timezone),
  );

  return {
    data: page.rows,
    meta: createListMeta(query, page.totalCount),
  };
}

export async function getBillingCycle(
  context: HouseholdContext,
  creditCardId: string,
  cycleId: string,
): Promise<CreditCardCycleDetailResponse> {
  const card = await creditCardsRepository.findByIdOrThrow(context.householdId, creditCardId);

  const cycle = await db.transaction(async (tx) => {
    await syncCardCycles(tx, card, context.timezone);
    const row = await findCreditCardCycle(tx, creditCardId, cycleId);
    return row;
  });

  const items = await cycleRepository.loadCycleItems(creditCardId, cycleId);
  const [enrichedCycle] = enrichCycleSummaries([cycle], context.timezone);

  return {
    cycle: enrichedCycle,
    items: mapCycleItems(items),
  };
}

export async function updateBillingCycle(
  context: HouseholdContext,
  creditCardId: string,
  cycleId: string,
  dto: UpdateCreditCardCycleDto,
): Promise<CreditCardCycleDetailResponse> {
  const card = await creditCardsRepository.findByIdOrThrow(context.householdId, creditCardId);

  await db.transaction(async (tx) => {
    const cycles = await syncCardCycles(tx, card, context.timezone);
    const orderedCycles = [...cycles].sort((left, right) =>
      left.closingDate < right.closingDate ? -1 : 1,
    );

    const cycleIndex = orderedCycles.findIndex((cycle) => cycle.id === cycleId);
    if (cycleIndex < 0) throw new NotFoundError("Billing cycle");

    const existingCycle = orderedCycles[cycleIndex];
    const today = getTodayInTimezone(context.timezone);
    if (existingCycle.closingDate < today) {
      throw new ConflictError("Historical billing cycles cannot be edited");
    }

    const previousCycle = cycleIndex > 0 ? orderedCycles[cycleIndex - 1] : null;
    const periodStart = previousCycle
      ? addDays(previousCycle.periodEnd, 1)
      : existingCycle.periodStart;
    const closingDate = dto.closingDate ?? existingCycle.closingDate;

    if (closingDate < periodStart) {
      throw new ValidationError("closingDate must be on or after periodStart");
    }

    const derivedDueDate =
      dto.dueDate ??
      (isAfter(closingDate, existingCycle.dueDate)
        ? buildCycleFromClosingDate(closingDate, card.closingDay, card.dueDay).dueDate
        : existingCycle.dueDate);

    if (derivedDueDate < closingDate) {
      throw new ValidationError("dueDate must be on or after closingDate");
    }

    await validateCycleWindowDoesNotOverlap(tx, creditCardId, cycleId, {
      periodStart,
      periodEnd: closingDate,
    });

    await cycleRepository.updateCycle(tx, cycleId, {
      periodStart,
      periodEnd: closingDate,
      closingDate,
      dueDate: derivedDueDate,
      updatedAt: now(),
    });

    let previousUpdatedCycle = await findCreditCardCycle(tx, creditCardId, cycleId);
    for (const futureCycle of orderedCycles.slice(cycleIndex + 1)) {
      const nextShape = getNextCycleShapeFromPeriodStart(
        getNextPeriodStart(previousUpdatedCycle.periodEnd),
        card.closingDay,
        card.dueDay,
      );

      const updatedCycle = await cycleRepository.updateCycle(tx, futureCycle.id, {
        periodStart: nextShape.periodStart,
        periodEnd: nextShape.periodEnd,
        closingDate: nextShape.closingDate,
        dueDate: nextShape.dueDate,
        updatedAt: now(),
      });

      if (!updatedCycle) throw new NotFoundError("Billing cycle");
      previousUpdatedCycle = updatedCycle;
    }

    await rebuildSchedulesFromClosingDate(tx, card, context.timezone, closingDate);
  });

  return getBillingCycle(context, creditCardId, cycleId);
}

export async function getForecast(
  context: HouseholdContext,
  creditCardId: string,
  query: CreditCardForecastQuery,
): Promise<CreditCardForecastResponse> {
  const card = await creditCardsRepository.findByIdOrThrow(context.householdId, creditCardId);
  const forecastStart = query.fromMonth
    ? parseMonthKey(query.fromMonth)
    : startOfMonth(getTodayInTimezone(context.timezone));
  const forecastEnd = addMonths(forecastStart, query.months - 1);

  await db.transaction(async (tx) => {
    const syncedCycles = await syncCardCycles(tx, card, context.timezone);
    let latestCycle = [...syncedCycles].sort((left, right) =>
      left.closingDate > right.closingDate ? -1 : 1,
    )[0];

    if (!latestCycle) {
      latestCycle = await ensureCurrentCycle(tx, card, context.timezone);
    }

    while (startOfMonth(latestCycle.dueDate) < forecastEnd) {
      latestCycle = await ensureNextCycleAfter(tx, card, latestCycle);
    }

    await syncCardCycles(tx, card, context.timezone);
  });

  const cycles = await db
    .select()
    .from(creditCardBillingCyclesTable)
    .where(eq(creditCardBillingCyclesTable.creditCardId, card.id))
    .orderBy(asc(creditCardBillingCyclesTable.dueDate));

  const filteredCycles = cycles.filter((cycle) => {
    const dueMonth = startOfMonth(cycle.dueDate);
    return dueMonth >= forecastStart && dueMonth <= forecastEnd;
  });

  const cycleItems = await Promise.all(
    filteredCycles.map(async (cycle) => ({
      cycle,
      items: await cycleRepository.loadCycleItems(card.id, cycle.id),
    })),
  );

  const enrichedCycles = enrichCycleSummaries(filteredCycles, context.timezone);
  const cyclesById = new Map(enrichedCycles.map((cycle) => [cycle.id, cycle]));

  return {
    creditCardId,
    fromMonth: formatMonthKey(forecastStart),
    months: query.months,
    cycles: cycleItems.map(({ cycle, items }) => {
      const enrichedCycle = cyclesById.get(cycle.id);
      if (!enrichedCycle) {
        throw new NotFoundError("Billing cycle");
      }

      return {
        ...enrichedCycle,
        items: mapCycleItems(items),
      };
    }),
  };
}

export async function listCyclesNeedingClosingReminder(referenceDate: Date) {
  return db
    .select()
    .from(creditCardBillingCyclesTable)
    .where(eq(creditCardBillingCyclesTable.closingDate, referenceDate))
    .orderBy(asc(creditCardBillingCyclesTable.closingDate));
}

export async function listCyclesNeedingDueReminder(referenceDate: Date) {
  return db
    .select()
    .from(creditCardBillingCyclesTable)
    .where(eq(creditCardBillingCyclesTable.dueDate, referenceDate))
    .orderBy(asc(creditCardBillingCyclesTable.dueDate));
}

export async function listCyclesOverdue(referenceDate: Date) {
  return db
    .select()
    .from(creditCardBillingCyclesTable)
    .where(
      and(
        lt(creditCardBillingCyclesTable.dueDate, referenceDate),
        gte(creditCardBillingCyclesTable.remainingAmount, 1),
      ),
    )
    .orderBy(asc(creditCardBillingCyclesTable.dueDate));
}

export async function listCardsWithCurrentCycle(referenceDate: Date) {
  return db
    .select({
      cardId: creditCardsTable.id,
      cycleId: creditCardBillingCyclesTable.id,
      householdTimezone: householdsTable.timezone,
    })
    .from(creditCardBillingCyclesTable)
    .innerJoin(creditCardsTable, eq(creditCardsTable.id, creditCardBillingCyclesTable.creditCardId))
    .innerJoin(householdsTable, eq(householdsTable.id, creditCardsTable.householdId))
    .where(
      and(
        lte(creditCardBillingCyclesTable.periodStart, referenceDate),
        gte(creditCardBillingCyclesTable.periodEnd, referenceDate),
      ),
    );
}

export async function listPayableCycles(tx: TxClient, card: CreditCardRow, timezone: string) {
  const syncedCycles = await syncCardCycles(tx, card, timezone);
  return [...syncedCycles]
    .filter((cycle) => cycle.remainingAmount > 0)
    .sort((left, right) =>
      left.dueDate < right.dueDate ? -1 : left.dueDate > right.dueDate ? 1 : 0,
    );
}
