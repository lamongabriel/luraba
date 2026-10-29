import type {
  createGoalBodySchema,
  createGoalContributionBodySchema,
  Goal,
  GoalContribution,
  GoalDetail,
  GoalState,
  updateGoalBodySchema,
  updateGoalContributionBodySchema,
} from "@luraba/contracts/goals";
import {
  buildGoalTimeline,
  estimateGoal,
  formatISODate,
  formatISODateTime,
  getTodayInTimezone,
  parseISODate,
} from "@luraba/domain";
import type { z } from "zod";
import type { HouseholdContext } from "@/config/permissions";
import { accountsRepository } from "@/modules/accounts/accounts.repository";
import {
  type LinkedTransaction,
  loadLinkedTransactions,
  requireLinkedTransaction,
} from "@/modules/transactions/transactions.linked";
import { ConflictError, isUniqueViolation, NotFoundError, ValidationError } from "@/shared/errors";
import { createListMeta, type ListResult } from "@/shared/list";
import { type CreateGoalValues, goalsRepository } from "./goals.repository";
import type { GoalContributionRecord, GoalRecord } from "./goals.types";

type CreateGoalInput = z.output<typeof createGoalBodySchema>;
type UpdateGoalInput = z.output<typeof updateGoalBodySchema>;
type CreateContributionInput = z.output<typeof createGoalContributionBodySchema>;
type UpdateContributionInput = z.output<typeof updateGoalContributionBodySchema>;

/** Dates arrive as instants; goals care about the calendar day. */
const toDay = (value: Date) => parseISODate(formatISODate(value));

// ─── Mapping ─────────────────────────────────────────────────────────────

function getGoalState(status: GoalRecord["status"], remaining: number, onTrack: boolean | null) {
  if (status !== "active") return status satisfies GoalState;
  if (remaining === 0) return "achieved";
  if (onTrack === null) return "open";
  return onTrack ? "on_track" : "behind";
}

/** The day the running total first reached the target, if it is still there. */
function findAchievedOn(
  target: number,
  contributions: readonly GoalContributionRecord[],
): Date | null {
  let total = 0;
  let reachedOn: Date | null = null;
  for (const contribution of contributions) {
    total += contribution.amount;
    if (total >= target) reachedOn ??= contribution.contributedOn;
    else reachedOn = null;
  }
  return reachedOn;
}

function mapContribution(
  row: GoalContributionRecord,
  transactions: Map<string, LinkedTransaction>,
): GoalContribution {
  return {
    id: row.id,
    amount: row.amount,
    contributedOn: formatISODate(row.contributedOn),
    note: row.note,
    transaction: row.transactionId ? (transactions.get(row.transactionId) ?? null) : null,
    createdAt: formatISODateTime(row.createdAt),
  };
}

function planOf(goal: GoalRecord, saved: number, today: Date) {
  return {
    targetAmount: goal.targetAmount,
    saved,
    startDate: goal.startDate,
    targetDate: goal.targetDate,
    monthlyContribution: goal.monthlyContribution,
    expectedReturnBps: goal.expectedReturnBps,
    today,
  };
}

function mapGoal(
  goal: GoalRecord,
  contributions: readonly GoalContributionRecord[],
  today: Date,
): Goal {
  const saved = contributions.reduce((sum, row) => sum + row.amount, 0);
  const estimate = estimateGoal(planOf(goal, saved, today));
  const achievedOn = findAchievedOn(goal.targetAmount, contributions);
  const last = contributions.at(-1);

  return {
    id: goal.id,
    name: goal.name,
    description: goal.description,
    kind: goal.kind,
    status: goal.status,
    state: getGoalState(goal.status, estimate.remaining, estimate.onTrack),
    targetAmount: goal.targetAmount,
    currencyCode: goal.currencyCode,
    startDate: formatISODate(goal.startDate),
    targetDate: goal.targetDate ? formatISODate(goal.targetDate) : null,
    monthlyContribution: goal.monthlyContribution,
    expectedReturnBps: goal.expectedReturnBps,
    accountId: goal.accountId,
    saved,
    contributionCount: contributions.length,
    lastContributionOn: last ? formatISODate(last.contributedOn) : null,
    achievedOn: achievedOn ? formatISODate(achievedOn) : null,
    estimate: {
      ...estimate,
      projectedCompletionDate: estimate.projectedCompletionDate
        ? formatISODate(estimate.projectedCompletionDate)
        : null,
    },
    createdAt: formatISODateTime(goal.createdAt),
    updatedAt: formatISODateTime(goal.updatedAt),
  };
}

async function buildSummaries(
  context: HouseholdContext,
  goals: readonly GoalRecord[],
): Promise<Goal[]> {
  const today = getTodayInTimezone(context.timezone);
  const rows = await goalsRepository.listContributions(goals.map((goal) => goal.id));
  const byGoal = new Map<string, GoalContributionRecord[]>();
  for (const row of rows) {
    const list = byGoal.get(row.goalId) ?? [];
    list.push(row);
    byGoal.set(row.goalId, list);
  }
  return goals.map((goal) => mapGoal(goal, byGoal.get(goal.id) ?? [], today));
}

async function presentGoal(context: HouseholdContext, goal: GoalRecord): Promise<GoalDetail> {
  const today = getTodayInTimezone(context.timezone);
  const rows = await goalsRepository.listContributions([goal.id]);
  const transactions = await loadLinkedTransactions(
    context,
    rows.map((row) => row.transactionId),
  );
  const summary = mapGoal(goal, rows, today);
  const timeline = buildGoalTimeline(
    planOf(goal, summary.saved, today),
    rows.map((row) => ({ date: row.contributedOn, amount: row.amount })),
  );

  return {
    ...summary,
    contributions: rows.map((row) => mapContribution(row, transactions)).reverse(),
    timeline,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────

async function requireGoal(context: HouseholdContext, id: string): Promise<GoalRecord> {
  const goal = await goalsRepository.get(id, context);
  if (!goal) throw new NotFoundError("Goal");
  return goal;
}

async function requireContribution(goalId: string, id: string): Promise<GoalContributionRecord> {
  const contribution = await goalsRepository.getContribution(goalId, id);
  if (!contribution) throw new NotFoundError("Contribution");
  return contribution;
}

async function requireAccount(context: HouseholdContext, accountId: string | null | undefined) {
  if (accountId && !(await accountsRepository.get(accountId, context))) {
    throw new NotFoundError("Account");
  }
}

function assertDatesInOrder(startDate: Date, targetDate: Date | null) {
  if (targetDate && targetDate < startDate) {
    throw new ValidationError("The target date cannot be before the start date");
  }
}

/** A linked transaction must be in the goal's currency and cannot be over-allocated. */
function assertTransactionFits(
  goal: GoalRecord,
  transaction: LinkedTransaction,
  amount: number,
): void {
  if (transaction.currencyCode !== goal.currencyCode) {
    throw new ValidationError(`This goal is in ${goal.currencyCode}; the transaction is not`);
  }
  if (Math.abs(amount) > transaction.amount) {
    throw new ValidationError("The contribution cannot be more than the transaction amount");
  }
}

// ─── Goals ───────────────────────────────────────────────────────────────

export async function listGoals(
  context: HouseholdContext,
  query: Parameters<typeof goalsRepository.listPage>[1],
): Promise<ListResult<Goal>> {
  const page = await goalsRepository.listPage(context, query);
  return {
    data: await buildSummaries(context, page.rows),
    meta: createListMeta(query, page.totalCount),
  };
}

export async function getGoal(context: HouseholdContext, id: string): Promise<GoalDetail> {
  return presentGoal(context, await requireGoal(context, id));
}

export async function createGoal(
  context: HouseholdContext,
  body: CreateGoalInput,
): Promise<GoalDetail> {
  await requireAccount(context, body.accountId);
  const startDate = body.startDate ? toDay(body.startDate) : getTodayInTimezone(context.timezone);
  const targetDate = body.targetDate ? toDay(body.targetDate) : null;
  assertDatesInOrder(startDate, targetDate);

  const values: CreateGoalValues = {
    createdByUserId: context.userId,
    name: body.name,
    description: body.description ?? null,
    kind: body.kind,
    targetAmount: body.targetAmount,
    currencyCode: body.currencyCode,
    startDate,
    targetDate,
    monthlyContribution: body.monthlyContribution ?? null,
    expectedReturnBps: body.kind === "investment" ? (body.expectedReturnBps ?? null) : null,
    accountId: body.accountId ?? null,
  };
  return presentGoal(context, await goalsRepository.create(context, values));
}

export async function updateGoal(
  context: HouseholdContext,
  id: string,
  body: UpdateGoalInput,
): Promise<GoalDetail> {
  const goal = await requireGoal(context, id);
  await requireAccount(context, body.accountId);

  const kind = body.kind ?? goal.kind;
  const startDate = body.startDate ? toDay(body.startDate) : goal.startDate;
  const targetDate =
    body.targetDate === undefined
      ? goal.targetDate
      : body.targetDate === null
        ? null
        : toDay(body.targetDate);
  assertDatesInOrder(startDate, targetDate);
  if (kind === "savings" && body.expectedReturnBps) {
    throw new ValidationError("Only investment goals can have an expected return");
  }

  const { startDate: _start, targetDate: _target, ...rest } = body;
  const updated = await goalsRepository.update(id, context, {
    ...rest,
    startDate,
    targetDate,
    // A savings goal has no expected return, including one switched from investment.
    ...(kind === "savings" ? { expectedReturnBps: null } : {}),
  });
  if (!updated) throw new NotFoundError("Goal");
  return presentGoal(context, updated);
}

export async function deleteGoal(context: HouseholdContext, id: string): Promise<void> {
  if (!(await goalsRepository.delete(id, context))) throw new NotFoundError("Goal");
}

// ─── Contributions ───────────────────────────────────────────────────────

export async function addContribution(
  context: HouseholdContext,
  goalId: string,
  body: CreateContributionInput,
): Promise<GoalDetail> {
  const goal = await requireGoal(context, goalId);

  let amount = body.amount;
  let contributedOn = body.contributedOn ? toDay(body.contributedOn) : undefined;
  if (body.transactionId) {
    const transaction = await requireLinkedTransaction(context, body.transactionId);
    amount ??= transaction.amount;
    contributedOn ??= parseISODate(transaction.postedDate.slice(0, 10));
    assertTransactionFits(goal, transaction, amount);
  }
  if (amount === undefined || !contributedOn) {
    throw new ValidationError("Enter an amount and a date, or link a transaction");
  }

  try {
    await goalsRepository.insertContribution({
      goalId,
      createdByUserId: context.userId,
      amount,
      contributedOn,
      note: body.note ?? null,
      transactionId: body.transactionId ?? null,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError("This transaction is already linked to a goal contribution");
    }
    throw error;
  }
  return presentGoal(context, goal);
}

export async function updateContribution(
  context: HouseholdContext,
  goalId: string,
  contributionId: string,
  body: UpdateContributionInput,
): Promise<GoalDetail> {
  const goal = await requireGoal(context, goalId);
  const current = await requireContribution(goalId, contributionId);

  const amount = body.amount ?? current.amount;
  const transactionId =
    body.transactionId === undefined ? current.transactionId : body.transactionId;
  if (transactionId) {
    assertTransactionFits(goal, await requireLinkedTransaction(context, transactionId), amount);
  }

  try {
    await goalsRepository.updateContribution(contributionId, {
      amount,
      transactionId,
      ...(body.contributedOn ? { contributedOn: toDay(body.contributedOn) } : {}),
      ...(body.note !== undefined ? { note: body.note } : {}),
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError("This transaction is already linked to a goal contribution");
    }
    throw error;
  }
  return presentGoal(context, goal);
}

export async function removeContribution(
  context: HouseholdContext,
  goalId: string,
  contributionId: string,
): Promise<GoalDetail> {
  const goal = await requireGoal(context, goalId);
  await requireContribution(goalId, contributionId);
  await goalsRepository.deleteContribution(contributionId);
  return presentGoal(context, goal);
}
