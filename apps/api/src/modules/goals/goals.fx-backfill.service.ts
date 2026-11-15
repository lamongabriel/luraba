import { getPermissionsForRole } from "@luraba/contracts";
import { formatISODate, normalizeFxRate } from "@luraba/domain";
import type { HouseholdContext } from "@/config/permissions";
import { logger } from "@/shared/logger";
import {
  convertWithContributionRate,
  MANUAL_RATE_SOURCE,
  resolveContributionRate,
} from "./goals.fx";
import { goalsRepository } from "./goals.repository";
import { syncLinkedTransfer } from "./goals.service";

export type FxBackfillRow = {
  contributionId: string;
  goalId: string;
  goalName: string;
  householdId: string;
  date: string;
  originalAmount: number;
  originalCurrency: string;
  goalCurrency: string;
  oldAmount: number;
  newAmount: number;
  oldRate: string | null;
  newRate: string;
  rateSource: string;
  rateDate: string;
  /** What the row needs: the converted amount, only the stored rate/source, or nothing. */
  change: "amount" | "rate" | "none";
  /** Why a row was left alone or could not be recomputed. */
  note?: string;
  applied: boolean;
};

export type FxBackfillReport = {
  mode: "dry-run" | "applied";
  scanned: number;
  changed: number;
  amountChanged: number;
  skipped: number;
  rows: FxBackfillRow[];
};

function contextFor(householdId: string, userId: string): HouseholdContext {
  return {
    householdId,
    userId,
    role: "owner",
    permissions: getPermissionsForRole("owner"),
    timezone: "UTC",
    creditExpenseTiming: "spend_month",
    creditInstallmentBudgetMode: "per_installment",
  };
}

/**
 * Recomputes every contribution made in another currency than its goal's from the historical rate of its
 * date (exact decimal rate, rounded once at the end), the way a new contribution is converted now.
 *
 * - Dry run by default: nothing is written, every row is reported.
 * - `apply`: updates the contribution (amount, rate, source, rate day) and the transfer behind it.
 * - Idempotent: a row already at its date's rate has `change: "none"`, so a second run changes nothing.
 * - Rates given by hand (`manual`) are respected unless `includeManual` is set.
 * - A row whose date has no rate is reported with a note and left as it is.
 */
export async function backfillContributionFxRates(options: {
  apply: boolean;
  includeManual?: boolean;
}): Promise<FxBackfillReport> {
  const found = await goalsRepository.listForeignContributions();
  const rows: FxBackfillRow[] = [];
  let skipped = 0;

  for (const { contribution, goal } of found) {
    const originalCurrency = contribution.originalCurrency as string;
    const originalAmount = contribution.originalAmount as number;
    const base = {
      contributionId: contribution.id,
      goalId: goal.id,
      goalName: goal.name,
      householdId: goal.householdId,
      date: formatISODate(contribution.contributedOn),
      originalAmount,
      originalCurrency,
      goalCurrency: goal.currencyCode,
      oldAmount: contribution.amount,
      oldRate: contribution.fxRate === null ? null : normalizeFxRate(contribution.fxRate),
    };
    const leave = (note: string) => {
      skipped += 1;
      rows.push({
        ...base,
        newAmount: contribution.amount,
        newRate: base.oldRate ?? "",
        rateSource: contribution.fxRateSource ?? "",
        rateDate: contribution.fxRateDate ? formatISODate(contribution.fxRateDate) : "",
        change: "none",
        note,
        applied: false,
      });
    };

    if (contribution.fxRateSource === MANUAL_RATE_SOURCE && !options.includeManual) {
      leave("rate was given by hand; kept (use --include-manual to recompute)");
      continue;
    }

    let rate: Awaited<ReturnType<typeof resolveContributionRate>>;
    try {
      rate = await resolveContributionRate({
        from: originalCurrency,
        to: goal.currencyCode,
        day: contribution.contributedOn,
      });
    } catch (error) {
      leave(`no rate: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    const newAmount = await convertWithContributionRate({
      amount: originalAmount,
      rate: rate.rate,
      from: originalCurrency,
      to: goal.currencyCode,
    });
    const sameRate =
      base.oldRate === rate.rate &&
      contribution.fxRateSource === rate.source &&
      contribution.fxRateDate !== null &&
      formatISODate(contribution.fxRateDate) === formatISODate(rate.rateDate);
    const change: FxBackfillRow["change"] =
      newAmount !== contribution.amount ? "amount" : sameRate ? "none" : "rate";
    const row: FxBackfillRow = {
      ...base,
      newAmount,
      newRate: rate.rate,
      rateSource: rate.source,
      rateDate: formatISODate(rate.rateDate),
      change,
      applied: false,
    };

    if (options.apply && change !== "none") {
      if (change === "amount" && contribution.transactionId) {
        await syncLinkedTransfer(
          contextFor(goal.householdId, contribution.createdByUserId ?? goal.createdByUserId),
          contribution,
          {
            transactionId: contribution.transactionId,
            day: contribution.contributedOn,
            goalCurrencyCode: goal.currencyCode,
            goalAmount: newAmount,
            original: { amount: originalAmount, currencyCode: originalCurrency },
          },
        ).catch((error: unknown) => {
          row.note = `transfer not updated: ${error instanceof Error ? error.message : String(error)}`;
          logger.warn({ err: error, contributionId: contribution.id }, "FX backfill transfer sync");
        });
      }
      await goalsRepository.updateContribution(contribution.id, {
        amount: newAmount,
        fxRate: rate.rate,
        fxRateSource: rate.source,
        fxRateDate: rate.rateDate,
      });
      row.applied = true;
    }
    rows.push(row);
  }

  return {
    mode: options.apply ? "applied" : "dry-run",
    scanned: found.length,
    changed: rows.filter((row) => row.change !== "none").length,
    amountChanged: rows.filter((row) => row.change === "amount").length,
    skipped,
    rows,
  };
}
