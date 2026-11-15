import { categoriesTable } from "@luraba/db/schemas/categories.schema";
import { householdsTable } from "@luraba/db/schemas/households.schema";
import {
  accrueDay,
  addDays,
  type BusinessCalendar,
  d,
  dailyFactor,
  formatISODate,
  getTodayInTimezone,
  type IndexData,
  startOfMonth,
} from "@luraba/domain";
import { and, eq, inArray, sql } from "drizzle-orm";
import { SYSTEM_LEDGER_CLASSIFICATIONS } from "@/config/transactions";
import { db } from "@/db";
import type { TxClient } from "@/db/types";
import * as entriesService from "@/modules/entries/entries.service";
import { loadCalendar, loadIndexData } from "@/modules/investments/investments.macro";
import { ledgerAccountsRepository } from "@/modules/ledger-accounts/ledger-accounts.repository";
import * as txRepository from "@/modules/transactions/transactions.repository";
import { NotFoundError } from "@/shared/errors";
import { logger } from "@/shared/logger";
import { piggyBanksRepository } from "./piggy-banks.repository";
import { yieldConfigOf } from "./piggy-banks.shared";
import type { PiggyBankRecord } from "./piggy-banks.types";

export const INTEREST_PARENT_CATEGORY = "Investment Income";
export const INTEREST_CATEGORY = "Interest";
/** Backfill is capped per piggy bank and run so one broken row cannot hang the job. */
const MAX_DAYS_PER_RUN = 3700;

export type AccrualResult = {
  through: string;
  /** Piggy-bank days processed in this run. */
  accrued: number;
  /** Piggy-bank days that were already accrued. */
  skipped: number;
  /** Interest transactions created. */
  posted: number;
};

export type AccrualDeps = {
  /** The latest day to accrue; default: the day before `today`. */
  through?: Date;
  /** Overrides "today" (tests); default: today in each household's time zone. */
  today?: Date;
  loadData?: (from: string) => Promise<IndexData>;
  loadCalendarFn?: () => Promise<BusinessCalendar>;
};

type Category = { id: string };
const categoryCache = new Map<string, Promise<Category>>();

/** Finds or creates Investment Income > Interest for a household. */
async function ensureInterestCategory(
  householdId: string,
  userId: string | null,
): Promise<Category> {
  const key = householdId;
  const cached = categoryCache.get(key);
  if (cached) return cached;
  const promise = (async () => {
    const find = async (name: string) => {
      const [row] = await db
        .select()
        .from(categoriesTable)
        .where(and(eq(categoriesTable.householdId, householdId), eq(categoriesTable.name, name)));
      return row;
    };
    let parent = await find(INTEREST_PARENT_CATEGORY);
    if (!parent) {
      await db
        .insert(categoriesTable)
        .values({
          householdId,
          name: INTEREST_PARENT_CATEGORY,
          type: "income",
          createdByUserId: userId,
        })
        .onConflictDoNothing();
      parent = await find(INTEREST_PARENT_CATEGORY);
    }
    let child = await find(INTEREST_CATEGORY);
    if (!child) {
      await db
        .insert(categoriesTable)
        .values({
          householdId,
          name: INTEREST_CATEGORY,
          type: "income",
          parentId: parent?.type === "income" ? parent.id : null,
          createdByUserId: userId,
        })
        .onConflictDoNothing();
      child = await find(INTEREST_CATEGORY);
    }
    const chosen = child?.type === "income" ? child : parent;
    if (!chosen) throw new NotFoundError("Interest category");
    return { id: chosen.id };
  })();
  categoryCache.set(key, promise);
  promise.catch(() => categoryCache.delete(key));
  return promise;
}

export function clearInterestCategoryCache(): void {
  categoryCache.clear();
}

/** Income on the parent account for one accrual day, plus its ledger entries. */
async function postInterestTransaction(
  tx: TxClient,
  piggy: PiggyBankRecord,
  day: Date,
  amount: number,
  categoryId: string,
): Promise<string> {
  const accountLedger = await ledgerAccountsRepository.findByOwner(
    "account",
    piggy.parentAccountId,
  );
  if (!accountLedger) throw new NotFoundError("Account ledger");
  const incomeLedger = await ledgerAccountsRepository.findOrCreateSystem(
    tx,
    `system:income:${piggy.currencyCode}`,
    SYSTEM_LEDGER_CLASSIFICATIONS.income,
    piggy.currencyCode,
  );
  const transaction = await txRepository.createTransaction(tx, {
    householdId: piggy.householdId,
    createdByUserId: piggy.createdByUserId,
    type: "income",
    categoryId,
    description: `Interest: ${piggy.title}`,
    notes: "Accrued automatically from the index rates (estimated until you confirm the balance)",
    includeInBudget: true,
    purchaseDate: day,
    postedDate: day,
  });
  await entriesService.createTransactionEntries(tx, transaction.id, [
    {
      ledgerAccountId: accountLedger.id,
      amount,
      currencyCode: piggy.currencyCode,
      categoryId,
      budgetMonth: startOfMonth(day),
    },
    { ledgerAccountId: incomeLedger.id, amount: -amount, currencyCode: piggy.currencyCode },
  ]);
  return transaction.id;
}

/**
 * Accrues one piggy bank day. One DB transaction: the accrual row, the interest transaction and
 * the movement commit together, and the accrual's primary key makes a repeat a no-op.
 */
async function accrueOneDay(
  piggy: PiggyBankRecord,
  day: Date,
  data: IndexData,
  calendar: BusinessCalendar,
): Promise<"accrued" | "skipped" | "posted"> {
  return db.transaction(async (tx) => {
    if (await piggyBanksRepository.getAccrual(piggy.id, day, tx)) return "skipped";

    // Money that came in up to and including the day earns that day's rate.
    const balanceRow = await tx.execute(sql`
      select coalesce(sum(amount), 0)::bigint as balance
      from piggy_bank_movements
      where piggy_bank_id = ${piggy.id} and occurred_on <= ${formatISODate(day)}
    `);
    const balance = Number((balanceRow.rows[0] as { balance: string }).balance);
    const previous = await piggyBanksRepository.lastAccrualBefore(piggy.id, day, tx);
    const factor = dailyFactor(yieldConfigOf(piggy), formatISODate(day), data, calendar);
    const result = accrueDay({
      balance: Math.max(0, balance),
      carryIn: d(previous?.carryOut ?? "0"),
      factor: factor.factor,
    });

    let movementId: string | null = null;
    let posted = false;
    if (result.posted > 0) {
      const category = await ensureInterestCategory(piggy.householdId, piggy.createdByUserId);
      const transactionId = await postInterestTransaction(
        tx,
        piggy,
        day,
        result.posted,
        category.id,
      );
      const [movement] = await piggyBanksRepository.insertMovements(tx, [
        {
          piggyBankId: piggy.id,
          kind: "interest",
          amount: result.posted,
          occurredOn: day,
          transactionId,
          estimated: true,
          createdByUserId: piggy.createdByUserId,
        },
      ]);
      movementId = movement?.id ?? null;
      posted = true;
    }

    const inserted = await piggyBanksRepository.insertAccrual(tx, {
      piggyBankId: piggy.id,
      accrualDate: day,
      openingBalance: balance,
      exactAmount: result.exact.toFixed(12),
      postedAmount: result.posted,
      carryOut: result.carryOut.toFixed(12),
      factor: factor.factor.toFixed(16),
      estimated: factor.estimated && factor.accrues,
      movementId,
    });
    if (!inserted) {
      // A concurrent run won: roll everything back.
      throw new AlreadyAccrued();
    }
    await piggyBanksRepository.setAccruedThrough(tx, piggy.id, day);
    return posted ? "posted" : "accrued";
  });
}

class AlreadyAccrued extends Error {}

async function householdTimezones(ids: readonly string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({ id: householdsTable.id, timezone: householdsTable.timezone })
    .from(householdsTable)
    .where(inArray(householdsTable.id, [...ids]));
  return new Map(rows.map((row) => [row.id, row.timezone]));
}

/**
 * Credits the interest of every active piggy bank up to yesterday (or `through`). Safe to run any
 * number of times: finished days are skipped, missed days are filled in order.
 */
export async function accruePiggyBanks(deps: AccrualDeps = {}): Promise<AccrualResult> {
  const piggies = await piggyBanksRepository.listAccruing();
  const timezones = await householdTimezones([...new Set(piggies.map((p) => p.householdId))]);
  const loadData = deps.loadData ?? loadIndexData;
  const calendar = await (deps.loadCalendarFn ?? loadCalendar)();

  const result: AccrualResult = { through: "", accrued: 0, skipped: 0, posted: 0 };
  let latest = "";
  for (const piggy of piggies) {
    const today =
      deps.today ?? getTodayInTimezone(timezones.get(piggy.householdId) ?? "America/Sao_Paulo");
    const through = deps.through ?? addDays(today, -1);
    // The maturity day itself does not accrue (the start day accrues, the end day does not).
    const lastAccruing = piggy.maturityDate ? addDays(piggy.maturityDate, -1) : null;
    const throughDay = lastAccruing && lastAccruing < through ? lastAccruing : through;
    if (formatISODate(through) > latest) latest = formatISODate(through);

    const first = await piggyBanksRepository.firstMovementDate(piggy.id);
    if (!first) continue;
    let start = piggy.accruedThrough ? addDays(piggy.accruedThrough, 1) : first;
    if (start < first) start = first;
    if (start > throughDay) continue;

    const data = await loadData(formatISODate(start));
    let processed = 0;
    for (
      let day = start;
      day <= throughDay && processed < MAX_DAYS_PER_RUN;
      day = addDays(day, 1)
    ) {
      processed += 1;
      try {
        const outcome = await accrueOneDay(piggy, day, data, calendar);
        if (outcome === "skipped") result.skipped += 1;
        else {
          result.accrued += 1;
          if (outcome === "posted") result.posted += 1;
        }
      } catch (error) {
        if (error instanceof AlreadyAccrued) {
          result.skipped += 1;
          continue;
        }
        logger.error(
          { error, piggyBankId: piggy.id, day: formatISODate(day) },
          "[piggy-banks] Accrual failed",
        );
        break; // keep the order: do not skip a day
      }
    }
  }
  result.through = latest || formatISODate(deps.through ?? addDays(deps.today ?? new Date(), -1));
  return result;
}
