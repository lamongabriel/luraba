import type {
  contributeToGoalBodySchema,
  createGoalBodySchema,
  createGoalContributionBodySchema,
  Goal,
  GoalContribution,
  GoalDetail,
  GoalLocation,
  GoalState,
  GoalsReport,
  moveGoalFundsBodySchema,
  updateGoalBodySchema,
  updateGoalContributionBodySchema,
  withdrawFromGoalBodySchema,
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
import * as transactionsService from "@/modules/transactions/transactions.service";
import { ConflictError, isUniqueViolation, NotFoundError, ValidationError } from "@/shared/errors";
import { createListMeta, type ListResult } from "@/shared/list";
import { type CreateGoalValues, goalsRepository, type NewContribution } from "./goals.repository";
import type { GoalContributionRecord, GoalRecord } from "./goals.types";

type CreateGoalInput = z.output<typeof createGoalBodySchema>;
type UpdateGoalInput = z.output<typeof updateGoalBodySchema>;
type CreateContributionInput = z.output<typeof createGoalContributionBodySchema>;
type UpdateContributionInput = z.output<typeof updateGoalContributionBodySchema>;
type ContributeInput = z.output<typeof contributeToGoalBodySchema>;
type MoveInput = z.output<typeof moveGoalFundsBodySchema>;
type WithdrawInput = z.output<typeof withdrawFromGoalBodySchema>;

const monthKey = (date: Date) => formatISODate(date).slice(0, 7);
const monthStart = (key: string) => parseISODate(`${key}-01`);
/** Moves are bookkeeping between accounts; only the other rows are progress. */
const countsAsProgress = (row: GoalContributionRecord) => row.kind !== "move";

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
    kind: row.kind as GoalContribution["kind"],
    amount: row.amount,
    fromAccountId: row.fromAccountId,
    toAccountId: row.toAccountId,
    originalAmount: row.originalAmount,
    originalCurrency: row.originalCurrency,
    fxRate: row.fxRate === null ? null : Number(row.fxRate),
    contributedOn: formatISODate(row.contributedOn),
    note: row.note,
    transaction: row.transactionId ? (transactions.get(row.transactionId) ?? null) : null,
    createdAt: formatISODateTime(row.createdAt),
  };
}

/** Where the goal's money sits: contributions land in `toAccountId`, withdrawals leave `fromAccountId`. */
function locationsOf(rows: readonly GoalContributionRecord[]): GoalLocation[] {
  const byAccount = new Map<string | null, number>();
  const add = (accountId: string | null, amount: number) =>
    byAccount.set(accountId, (byAccount.get(accountId) ?? 0) + amount);
  for (const row of rows) {
    if (row.kind === "move") {
      add(row.fromAccountId, -row.amount);
      add(row.toAccountId, row.amount);
    } else if (row.kind === "withdrawal") add(row.fromAccountId, row.amount);
    else add(row.toAccountId, row.amount);
  }
  return [...byAccount]
    .filter(([, amount]) => amount !== 0)
    .map(([accountId, amount]) => ({ accountId, amount }))
    .sort((a, b) => b.amount - a.amount);
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

function mapGoal(goal: GoalRecord, allRows: readonly GoalContributionRecord[], today: Date): Goal {
  const contributions = allRows.filter(countsAsProgress);
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
    endMonth: goal.endMonth ? monthKey(goal.endMonth) : null,
    locations: locationsOf(allRows),
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
    createdByUserId: goal.createdByUserId,
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
    rows.filter(countsAsProgress).map((row) => ({ date: row.contributedOn, amount: row.amount })),
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
    endMonth: body.endMonth ? monthStart(body.endMonth) : null,
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
  const monthlyContribution =
    body.monthlyContribution === undefined ? goal.monthlyContribution : body.monthlyContribution;
  if (targetDate && monthlyContribution) {
    throw new ValidationError("Plan with a monthly amount or a target date, not both");
  }
  if (kind === "savings" && body.expectedReturnBps) {
    throw new ValidationError("Only investment goals can have an expected return");
  }

  const { startDate: _start, targetDate: _target, endMonth, ...rest } = body;
  const updated = await goalsRepository.update(id, context, {
    ...rest,
    ...(endMonth === undefined ? {} : { endMonth: endMonth ? monthStart(endMonth) : null }),
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
      kind: amount < 0 ? "withdrawal" : "contribution",
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
      ...(current.kind === "move" ? {} : { kind: amount < 0 ? "withdrawal" : "contribution" }),
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

// ─── Funds: contribute, move, withdraw ───────────────────────────────────

async function requireCashAccount(context: HouseholdContext, accountId: string) {
  const account = await accountsRepository.get(accountId, context);
  if (!account) throw new NotFoundError("Account");
  return account;
}

/**
 * Records a transfer of `amount` (in `currencyCode`) between two accounts. The side in that
 * currency takes the amount as given; the other side is converted by the transfer itself.
 */
async function createFundsTransfer(
  context: HouseholdContext,
  input: {
    description: string;
    date: Date;
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    currencyCode: string;
    /** The same money in another currency, so an account in it gets exactly this amount. */
    counterpart?: { amount: number; currencyCode: string };
  },
): Promise<string> {
  if (input.fromAccountId === input.toAccountId) {
    throw new ValidationError("The source and destination accounts must be different");
  }
  const [from, to] = await Promise.all([
    requireCashAccount(context, input.fromAccountId),
    requireCashAccount(context, input.toAccountId),
  ]);
  const amountIn = (currencyCode: string) =>
    currencyCode === input.currencyCode
      ? input.amount
      : currencyCode === input.counterpart?.currencyCode
        ? input.counterpart.amount
        : undefined;
  const fromAmount = amountIn(from.currencyId);
  const toAmount = amountIn(to.currencyId);
  const amounts =
    fromAmount === undefined && toAmount === undefined
      ? null
      : {
          ...(fromAmount === undefined ? {} : { fromAmount }),
          ...(toAmount === undefined ? {} : { toAmount }),
        };
  if (!amounts) {
    throw new ValidationError(
      `Neither account is in ${input.currencyCode}; give the amount in the currency of one of them`,
    );
  }
  const transfer = await transactionsService.createTransaction(context, {
    type: "transfer",
    description: input.description,
    purchaseDate: input.date,
    postedDate: input.date,
    fromAccountId: input.fromAccountId,
    toAccountId: input.toAccountId,
    ...amounts,
  });
  return transfer.id;
}

async function insertFundsRow(
  context: HouseholdContext,
  goalId: string,
  values: Omit<NewContribution, "goalId" | "createdByUserId">,
) {
  try {
    await goalsRepository.insertContribution({
      ...values,
      goalId,
      createdByUserId: context.userId,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError("This transaction is already linked to a goal contribution");
    }
    throw error;
  }
}

export async function contributeToGoal(
  context: HouseholdContext,
  goalId: string,
  body: ContributeInput,
): Promise<GoalDetail> {
  const goal = await requireGoal(context, goalId);
  const currencyCode = body.currencyCode ?? goal.currencyCode;
  const foreign = currencyCode !== goal.currencyCode;
  if (foreign && !body.fxRate) {
    throw new ValidationError(
      `This goal is in ${goal.currencyCode}; give fxRate (${goal.currencyCode} per 1 ${currencyCode})`,
    );
  }
  const goalAmount = foreign ? Math.round(body.amount * (body.fxRate ?? 1)) : body.amount;
  if (goalAmount <= 0) throw new ValidationError("The converted amount must be more than zero");
  const date = body.contributedOn
    ? toDay(body.contributedOn)
    : getTodayInTimezone(context.timezone);

  let transactionId = body.transactionId;
  if (transactionId) {
    await requireLinkedTransaction(context, transactionId);
    await Promise.all([
      requireCashAccount(context, body.fromAccountId),
      requireCashAccount(context, body.toAccountId),
    ]);
  } else {
    transactionId = await createFundsTransfer(context, {
      description: `Contribution to ${goal.name}`,
      date,
      fromAccountId: body.fromAccountId,
      toAccountId: body.toAccountId,
      amount: body.amount,
      currencyCode,
      ...(foreign ? { counterpart: { amount: goalAmount, currencyCode: goal.currencyCode } } : {}),
    });
  }

  await insertFundsRow(context, goalId, {
    kind: "contribution",
    amount: goalAmount,
    contributedOn: date,
    note: body.note ?? null,
    transactionId,
    fromAccountId: body.fromAccountId,
    toAccountId: body.toAccountId,
    originalAmount: foreign ? body.amount : null,
    originalCurrency: foreign ? currencyCode : null,
    fxRate: foreign ? String(body.fxRate) : null,
  });
  return presentGoal(context, goal);
}

export async function moveGoalFunds(
  context: HouseholdContext,
  goalId: string,
  body: MoveInput,
): Promise<GoalDetail> {
  const goal = await requireGoal(context, goalId);
  const rows = await goalsRepository.listContributions([goalId]);
  const held = locationsOf(rows).find((item) => item.accountId === body.fromAccountId)?.amount ?? 0;
  if (held < body.amount) {
    throw new ValidationError(
      `That account holds ${held} of this goal in minor units, less than the ${body.amount} to move`,
    );
  }
  const date = body.contributedOn
    ? toDay(body.contributedOn)
    : getTodayInTimezone(context.timezone);

  let transactionId = body.transactionId;
  if (transactionId) await requireLinkedTransaction(context, transactionId);
  else {
    transactionId = await createFundsTransfer(context, {
      description: `Move ${goal.name} funds`,
      date,
      fromAccountId: body.fromAccountId,
      toAccountId: body.toAccountId,
      amount: body.amount,
      currencyCode: goal.currencyCode,
    });
  }

  await insertFundsRow(context, goalId, {
    kind: "move",
    amount: body.amount,
    contributedOn: date,
    note: body.note ?? null,
    transactionId,
    fromAccountId: body.fromAccountId,
    toAccountId: body.toAccountId,
  });
  return presentGoal(context, goal);
}

export async function withdrawFromGoal(
  context: HouseholdContext,
  goalId: string,
  body: WithdrawInput,
): Promise<GoalDetail> {
  const goal = await requireGoal(context, goalId);
  await requireCashAccount(context, body.fromAccountId);

  let amount = body.amount;
  let date = body.contributedOn ? toDay(body.contributedOn) : undefined;
  let transactionId: string | undefined;
  if (body.expenseId) {
    const expense = await requireLinkedTransaction(context, body.expenseId);
    if (amount === undefined) {
      if (expense.currencyCode !== goal.currencyCode) {
        throw new ValidationError(
          `The expense is not in ${goal.currencyCode}; give the amount to take out of the goal`,
        );
      }
      amount = expense.amount;
    }
    date ??= parseISODate(expense.postedDate.slice(0, 10));
    transactionId = expense.id;
  }
  date ??= getTodayInTimezone(context.timezone);
  if (amount === undefined) throw new ValidationError("Enter an amount, or link the expense");

  if (!transactionId && body.toAccountId) {
    transactionId = await createFundsTransfer(context, {
      description: `Withdrawal from ${goal.name}`,
      date,
      fromAccountId: body.fromAccountId,
      toAccountId: body.toAccountId,
      amount,
      currencyCode: goal.currencyCode,
    });
  }

  await insertFundsRow(context, goalId, {
    kind: "withdrawal",
    amount: -amount,
    contributedOn: date,
    note: body.note ?? null,
    transactionId: transactionId ?? null,
    fromAccountId: body.fromAccountId,
    toAccountId: body.toAccountId ?? null,
  });
  return presentGoal(context, goal);
}

// ─── Report ──────────────────────────────────────────────────────────────

/** Per-goal progress for a month: planned vs contributed, totals and where the money sits. */
export async function getGoalsReport(
  context: HouseholdContext,
  month: string | undefined,
): Promise<GoalsReport> {
  const today = getTodayInTimezone(context.timezone);
  const key = month ?? monthKey(today);
  const goals = (await goalsRepository.listAll(context)).filter(
    (goal) => goal.status !== "canceled",
  );
  const summaries = await buildSummaries(context, goals);
  const rows = await goalsRepository.listContributions(goals.map((goal) => goal.id));

  return {
    month: key,
    goals: goals.map((goal, index) => {
      const summary = summaries[index] as Goal;
      const inPlan =
        goal.status === "active" &&
        monthKey(goal.startDate) <= key &&
        (!goal.endMonth || monthKey(goal.endMonth) >= key);
      const contributed = rows
        .filter(
          (row) =>
            row.goalId === goal.id && countsAsProgress(row) && monthKey(row.contributedOn) === key,
        )
        .reduce((sum, row) => sum + row.amount, 0);
      return {
        goalId: goal.id,
        name: goal.name,
        kind: goal.kind,
        state: summary.state,
        currencyCode: goal.currencyCode,
        planned: inPlan ? (goal.monthlyContribution ?? 0) : 0,
        contributed,
        saved: summary.saved,
        targetAmount: goal.targetAmount,
        percent: summary.estimate.percent,
        onTrack: summary.estimate.onTrack,
        locations: summary.locations,
      };
    }),
  };
}
