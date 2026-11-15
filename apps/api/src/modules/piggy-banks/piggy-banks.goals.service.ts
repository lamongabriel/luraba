import type {
  GoalPiggyBanks,
  GoalPiggyPlan,
  PiggyBankGoalLink,
} from "@luraba/contracts/piggy-banks";
import {
  buildProjectionSeries,
  formatISODate,
  getTodayInTimezone,
  type PiggyGoalPlanInput,
  planWithYield,
  projectedAnnualRate,
  trackMonths,
  weightedAnnualRate,
  wholeMonthsBetween,
} from "@luraba/domain";
import type { HouseholdContext } from "@/config/permissions";
import { fxService } from "@/modules/fx/fx.service";
import { goalsRepository } from "@/modules/goals/goals.repository";
import type { GoalRecord } from "@/modules/goals/goals.types";
import { loadIndexData } from "@/modules/investments/investments.macro";
import { ConflictError, NotFoundError, ValidationError } from "@/shared/errors";
import { piggyBanksRepository } from "./piggy-banks.repository";
import { type PiggyWithParent, yieldConfigOf } from "./piggy-banks.shared";
import { FLOW_KINDS } from "./piggy-banks.types";

type GoalLike = Pick<GoalRecord, "id" | "currencyCode">;

export type LinkedPiggy = GoalPiggyBanks["piggyBanks"][number] & { parentAccountId: string };
export type LinkedProgress = {
  piggyBanks: LinkedPiggy[];
  /** Sum of the linked balances in the goal's currency. */
  saved: number;
};

async function convert(amount: number, from: string, to: string, date: Date): Promise<number> {
  if (amount === 0 || from === to) return amount;
  return fxService.convertAmount({ amount, fromCurrencyCode: from, toCurrencyCode: to, date });
}

/** Expected yearly rate (a fraction) of a piggy bank from today's index projections. */
export async function annualRatesOf(
  piggies: readonly PiggyWithParent[],
  today: Date,
): Promise<Map<string, number>> {
  const rates = new Map<string, number>();
  const accruing = piggies.filter((piggy) => piggy.yieldType !== "none");
  const data = accruing.length > 0 ? await loadIndexData(formatISODate(today)) : null;
  for (const piggy of piggies) {
    rates.set(piggy.id, data ? projectedAnnualRate(yieldConfigOf(piggy), data) : 0);
  }
  return rates;
}

/**
 * Progress of goals that have linked piggy banks. Goals without links are absent from the map,
 * so callers fall back to contributions.
 */
export async function loadLinkedProgress(
  context: HouseholdContext,
  goals: readonly GoalLike[],
): Promise<Map<string, LinkedProgress>> {
  const result = new Map<string, LinkedProgress>();
  const links = await piggyBanksRepository.goalLinks(goals.map((goal) => goal.id));
  if (links.length === 0) return result;

  const piggies = await piggyBanksRepository.listByHousehold(context, {
    piggyBankIds: [...new Set(links.map((link) => link.piggyBankId))],
    includeArchived: true,
  });
  const byId = new Map(piggies.map((piggy) => [piggy.id, piggy]));
  const balances = await piggyBanksRepository.balances(piggies.map((piggy) => piggy.id));
  const today = getTodayInTimezone(context.timezone);
  const rates = await annualRatesOf(piggies, today);

  for (const goal of goals) {
    const goalLinks = links.filter((link) => link.goalId === goal.id);
    if (goalLinks.length === 0) continue;
    const linked: LinkedPiggy[] = [];
    for (const link of goalLinks) {
      const piggy = byId.get(link.piggyBankId);
      if (!piggy) continue;
      const balance = balances.get(piggy.id) ?? 0;
      linked.push({
        id: piggy.id,
        title: piggy.title,
        currencyCode: piggy.currencyCode,
        parentAccountId: piggy.parentAccountId,
        balance,
        balanceInGoalCurrency: await convert(balance, piggy.currencyCode, goal.currencyCode, today),
        annualRate: rates.get(piggy.id) ?? 0,
      });
    }
    result.set(goal.id, {
      piggyBanks: linked,
      saved: linked.reduce((sum, item) => sum + item.balanceInGoalCurrency, 0),
    });
  }
  return result;
}

/** The goals a set of piggy banks count toward, with their progress. */
export async function loadGoalLinksForPiggyBanks(
  context: HouseholdContext,
  piggyBankIds: readonly string[],
): Promise<Map<string, PiggyBankGoalLink[]>> {
  const result = new Map<string, PiggyBankGoalLink[]>();
  const links = await piggyBanksRepository.linksForPiggyBanks(piggyBankIds);
  if (links.length === 0) return result;
  const goalIds = new Set(links.map((link) => link.goalId));
  const goals = (await goalsRepository.listAll(context)).filter((goal) => goalIds.has(goal.id));
  const progress = await loadLinkedProgress(context, goals);
  const byGoal = new Map(goals.map((goal) => [goal.id, goal]));
  for (const link of links) {
    const goal = byGoal.get(link.goalId);
    if (!goal) continue;
    const saved = progress.get(goal.id)?.saved ?? 0;
    const list = result.get(link.piggyBankId) ?? [];
    list.push({
      id: goal.id,
      name: goal.name,
      currencyCode: goal.currencyCode,
      targetAmount: goal.targetAmount,
      saved,
      percent:
        goal.targetAmount > 0
          ? Math.min(100, Math.floor((Math.max(0, saved) / goal.targetAmount) * 100))
          : 0,
    });
    result.set(link.piggyBankId, list);
  }
  return result;
}

async function requireGoal(context: HouseholdContext, goalId: string): Promise<GoalRecord> {
  const goal = await goalsRepository.get(goalId, context);
  if (!goal) throw new NotFoundError("Goal");
  return goal;
}

/** Contributions are refused on a goal driven by piggy banks. */
export async function assertGoalNotLinked(goalId: string): Promise<void> {
  const links = await piggyBanksRepository.goalLinks([goalId]);
  if (links.length > 0) {
    throw new ConflictError(
      "This goal tracks its linked piggy banks. Deposit to a piggy bank, or unlink them first.",
    );
  }
}

function present(goalId: string, progress: LinkedProgress | undefined): GoalPiggyBanks {
  return {
    goalId,
    piggyBanks: (progress?.piggyBanks ?? []).map(({ parentAccountId: _unused, ...rest }) => rest),
    saved: progress?.saved ?? 0,
  };
}

export async function getGoalPiggyBanks(
  context: HouseholdContext,
  goalId: string,
): Promise<GoalPiggyBanks> {
  const goal = await requireGoal(context, goalId);
  const progress = await loadLinkedProgress(context, [goal]);
  return present(goal.id, progress.get(goal.id));
}

export async function setGoalPiggyBanks(
  context: HouseholdContext,
  goalId: string,
  piggyBankIds: readonly string[],
): Promise<GoalPiggyBanks> {
  const goal = await requireGoal(context, goalId);
  const unique = [...new Set(piggyBankIds)];
  const found = await piggyBanksRepository.listByHousehold(context, {
    piggyBankIds: unique,
    includeArchived: true,
  });
  if (found.length !== unique.length) throw new NotFoundError("Piggy bank");
  if (found.some((piggy) => piggy.archivedAt)) {
    throw new ValidationError("An archived piggy bank cannot be linked to a goal");
  }
  await piggyBanksRepository.replaceGoalLinks(goal.id, unique);
  return getGoalPiggyBanks(context, goalId);
}

/** Months from the current month through `endMonth`, inclusive; 0 once it has passed. */
function monthsThrough(today: Date, endMonth: Date): number {
  const current = today.getUTCFullYear() * 12 + today.getUTCMonth();
  const end = endMonth.getUTCFullYear() * 12 + endMonth.getUTCMonth();
  return Math.max(0, end - current + 1);
}

const DEFAULT_HORIZON_MONTHS = 24;
const MAX_SERIES_MONTHS = 120;

/** The yield-aware plan, per-month tracking and projection series of a goal's linked piggy banks. */
export async function getGoalPiggyPlan(
  context: HouseholdContext,
  goalId: string,
): Promise<GoalPiggyPlan> {
  const goal = await requireGoal(context, goalId);
  const progress = (await loadLinkedProgress(context, [goal])).get(goal.id);
  if (!progress) throw new ConflictError("Link at least one piggy bank to this goal first");

  const today = getTodayInTimezone(context.timezone);
  const saved = progress.saved;
  const annualRate = weightedAnnualRate(
    progress.piggyBanks.map((item) => ({
      balance: item.balanceInGoalCurrency,
      annualRate: item.annualRate,
    })),
  );

  let input: PiggyGoalPlanInput | null = null;
  if (goal.monthlyContribution && goal.endMonth) {
    input = {
      mode: "fixed_monthly_for_months",
      start: saved,
      target: goal.targetAmount,
      monthly: goal.monthlyContribution,
      months: monthsThrough(today, goal.endMonth),
      annualRate,
    };
  } else if (goal.monthlyContribution) {
    input = {
      mode: "fixed_monthly",
      start: saved,
      target: goal.targetAmount,
      monthly: goal.monthlyContribution,
      annualRate,
    };
  } else if (goal.targetDate && goal.targetDate > today) {
    input = {
      mode: "target_by_date",
      start: saved,
      target: goal.targetAmount,
      months: Math.max(1, wholeMonthsBetween(today, goal.targetDate)),
      annualRate,
    };
  }
  const plan = input ? planWithYield(input) : null;

  // Planned vs actual per month: net deposits into the linked piggy banks, in the goal's currency.
  let tracking: GoalPiggyPlan["tracking"] = null;
  const monthlyPlanned = plan?.monthly ?? 0;
  if (plan && monthlyPlanned > 0) {
    const startMonthDate = new Date(
      Date.UTC(goal.startDate.getUTCFullYear(), goal.startDate.getUTCMonth(), 1),
    );
    const flows = await piggyBanksRepository.monthlyFlows(
      progress.piggyBanks.map((item) => item.id),
      FLOW_KINDS,
      startMonthDate,
    );
    const currencies = new Map(progress.piggyBanks.map((item) => [item.id, item.currencyCode]));
    const byMonth = new Map<string, number>();
    for (const flow of flows) {
      const converted = await convert(
        flow.total,
        currencies.get(flow.piggyBankId) ?? goal.currencyCode,
        goal.currencyCode,
        today,
      );
      byMonth.set(flow.month, (byMonth.get(flow.month) ?? 0) + converted);
    }
    const endMonth = goal.endMonth
      ? formatISODate(goal.endMonth).slice(0, 7)
      : goal.targetDate
        ? formatISODate(goal.targetDate).slice(0, 7)
        : null;
    tracking = trackMonths({
      startMonth: formatISODate(goal.startDate).slice(0, 7),
      endMonth,
      monthlyPlanned,
      deposits: [...byMonth].map(([month, amount]) => ({ month, amount })),
      today: formatISODate(today),
    });
  }

  const horizon = Math.min(MAX_SERIES_MONTHS, plan?.months ?? DEFAULT_HORIZON_MONTHS);
  const projection = buildProjectionSeries({
    startMonth: `${formatISODate(today).slice(0, 7)}-01`,
    start: saved,
    monthly: monthlyPlanned,
    annualRate,
    months: Math.max(1, horizon),
    target: goal.targetAmount,
  });

  return {
    goalId: goal.id,
    currencyCode: goal.currencyCode,
    targetAmount: goal.targetAmount,
    saved,
    annualRate,
    plan,
    tracking,
    projection,
    piggyBanks: present(goal.id, progress).piggyBanks,
  };
}

/** Net deposits into a goal's linked piggy banks dated in a month, in the goal's currency. */
export async function linkedMonthFlow(
  context: HouseholdContext,
  goal: GoalLike,
  progress: LinkedProgress,
  monthKey: string,
): Promise<number> {
  const first = new Date(`${monthKey}-01T00:00:00.000Z`);
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0));
  const today = getTodayInTimezone(context.timezone);
  let total = 0;
  for (const item of progress.piggyBanks) {
    const sums = await piggyBanksRepository.sumByKinds([item.id], FLOW_KINDS, {
      from: first,
      to: last,
    });
    total += await convert(sums.get(item.id) ?? 0, item.currencyCode, goal.currencyCode, today);
  }
  return total;
}
