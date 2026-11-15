import type {
  contributeToGoalBodySchema,
  createGoalBodySchema,
  createGoalContributionBodySchema,
  Goal,
  GoalContribution,
  GoalContributionQuote,
  GoalDetail,
  GoalLocation,
  GoalState,
  GoalsReport,
  goalContributionQuoteQuerySchema,
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
  normalizeFxRate,
  parseISODate,
  weightedAnnualRate,
} from "@luraba/domain";
import type { z } from "zod";
import type { HouseholdContext } from "@/config/permissions";
import { accountsRepository } from "@/modules/accounts/accounts.repository";
import {
  assertGoalNotLinked,
  type LinkedProgress,
  linkedMonthFlow,
  loadLinkedProgress,
} from "@/modules/piggy-banks/piggy-banks.goals.service";
import {
  isLinkedTransfer,
  type LinkedTransaction,
  loadLinkedTransactions,
  requireLinkedTransaction,
} from "@/modules/transactions/transactions.linked";
import * as transactionsService from "@/modules/transactions/transactions.service";
import { ConflictError, isUniqueViolation, NotFoundError, ValidationError } from "@/shared/errors";
import { createListMeta, type ListResult } from "@/shared/list";
import {
  type ContributionRate,
  convertWithContributionRate,
  MANUAL_RATE_SOURCE,
  resolveContributionRate,
} from "./goals.fx";
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
    fxRateSource: row.fxRateSource,
    fxRateDate: row.fxRateDate ? formatISODate(row.fxRateDate) : null,
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

/** Where a linked goal's money sits: the parent accounts of its piggy banks. */
function linkedLocations(linked: LinkedProgress): GoalLocation[] {
  const byAccount = new Map<string, number>();
  for (const item of linked.piggyBanks) {
    byAccount.set(
      item.parentAccountId,
      (byAccount.get(item.parentAccountId) ?? 0) + item.balanceInGoalCurrency,
    );
  }
  return [...byAccount]
    .filter(([, amount]) => amount !== 0)
    .map(([accountId, amount]) => ({ accountId, amount }))
    .sort((a, b) => b.amount - a.amount);
}

/** Linked piggy banks earn a known yield: the estimate uses their weighted rate. */
function linkedReturnBps(progress: LinkedProgress | undefined): number | null {
  if (!progress || progress.piggyBanks.length === 0) return null;
  const rate = weightedAnnualRate(
    progress.piggyBanks.map((item) => ({
      balance: item.balanceInGoalCurrency,
      annualRate: item.annualRate,
    })),
  );
  return rate > 0 ? Math.round(rate * 10_000) : null;
}

function planOf(goal: GoalRecord, saved: number, today: Date, progress?: LinkedProgress) {
  return {
    targetAmount: goal.targetAmount,
    saved,
    startDate: goal.startDate,
    targetDate: goal.targetDate,
    monthlyContribution: goal.monthlyContribution,
    expectedReturnBps: linkedReturnBps(progress) ?? goal.expectedReturnBps,
    today,
  };
}

function mapGoal(
  goal: GoalRecord,
  allRows: readonly GoalContributionRecord[],
  today: Date,
  linked?: LinkedProgress,
): Goal {
  const contributions = allRows.filter(countsAsProgress);
  // A goal with linked piggy banks is driven by their balances; contributions no longer count.
  const saved = linked ? linked.saved : contributions.reduce((sum, row) => sum + row.amount, 0);
  const estimate = estimateGoal(planOf(goal, saved, today, linked));
  const achievedOn = linked ? null : findAchievedOn(goal.targetAmount, contributions);
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
    locations: linked ? linkedLocations(linked) : locationsOf(allRows),
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
  const linked = await loadLinkedProgress(context, goals);
  const byGoal = new Map<string, GoalContributionRecord[]>();
  for (const row of rows) {
    const list = byGoal.get(row.goalId) ?? [];
    list.push(row);
    byGoal.set(row.goalId, list);
  }
  return goals.map((goal) => mapGoal(goal, byGoal.get(goal.id) ?? [], today, linked.get(goal.id)));
}

async function presentGoal(context: HouseholdContext, goal: GoalRecord): Promise<GoalDetail> {
  const today = getTodayInTimezone(context.timezone);
  const rows = await goalsRepository.listContributions([goal.id]);
  const transactions = await loadLinkedTransactions(
    context,
    rows.map((row) => row.transactionId),
  );
  const linked = (await loadLinkedProgress(context, [goal])).get(goal.id);
  const summary = mapGoal(goal, rows, today, linked);
  const timeline = buildGoalTimeline(
    planOf(goal, summary.saved, today, linked),
    linked
      ? []
      : rows
          .filter(countsAsProgress)
          .map((row) => ({ date: row.contributedOn, amount: row.amount })),
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
  await assertGoalNotLinked(goal.id);

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
  await assertGoalNotLinked(goal.id);
  const current = await requireContribution(goalId, contributionId);
  const foreign = current.kind === "contribution" && current.originalCurrency !== null;
  if (!foreign && (body.fxRate !== undefined || body.recompute !== undefined)) {
    throw new ValidationError("Only a contribution made in another currency has an exchange rate");
  }

  const day = body.contributedOn ? toDay(body.contributedOn) : current.contributedOn;
  let amount = body.amount ?? current.amount;
  let fxChanges: ReturnType<typeof fxColumns> | null = null;
  let originalAmount = current.originalAmount;
  if (foreign && current.originalCurrency) {
    originalAmount = body.amount ?? current.originalAmount;
    if (originalAmount === null || originalAmount <= 0) {
      throw new ValidationError("The amount must be more than zero");
    }
    // The rate stays as stored unless a new one is given or a recompute is asked for.
    const keep =
      body.fxRate === undefined && !body.recompute && current.fxRate !== null
        ? {
            rate: normalizeFxRate(current.fxRate),
            source: current.fxRateSource ?? MANUAL_RATE_SOURCE,
            rateDate: current.fxRateDate ?? current.contributedOn,
          }
        : null;
    const converted = keep
      ? {
          rate: keep,
          amount: await convertWithContributionRate({
            amount: originalAmount,
            rate: keep.rate,
            from: current.originalCurrency,
            to: goal.currencyCode,
          }),
        }
      : await convertContribution({
          amount: originalAmount,
          from: current.originalCurrency,
          to: goal.currencyCode,
          day,
          fxRate: body.fxRate,
        });
    if (converted.amount <= 0) {
      throw new ValidationError("The converted amount must be more than zero");
    }
    amount = converted.amount;
    fxChanges = fxColumns(converted.rate);
  }

  const transactionId =
    body.transactionId === undefined ? current.transactionId : body.transactionId;
  if (transactionId) {
    const linked = await requireLinkedTransaction(context, transactionId);
    // A foreign contribution is linked to a transfer whose sides hold the original and the converted
    // amounts, so the "fits" check only applies to goal-currency links.
    if (!foreign) assertTransactionFits(goal, linked, amount);
  }

  // Keep the books in step: the linked transfer takes the new amounts and date.
  const changed =
    amount !== current.amount || formatISODate(day) !== formatISODate(current.contributedOn);
  if (changed && transactionId && transactionId === current.transactionId) {
    await syncLinkedTransfer(context, current, {
      transactionId,
      day,
      goalCurrencyCode: goal.currencyCode,
      goalAmount: amount,
      original:
        foreign && current.originalCurrency && originalAmount !== null
          ? { amount: originalAmount, currencyCode: current.originalCurrency }
          : null,
    });
  }

  try {
    await goalsRepository.updateContribution(contributionId, {
      amount,
      transactionId,
      ...(current.kind === "move" ? {} : { kind: amount < 0 ? "withdrawal" : "contribution" }),
      ...(body.contributedOn ? { contributedOn: day } : {}),
      ...(body.note !== undefined ? { note: body.note } : {}),
      ...(fxChanges ? { originalAmount, ...fxChanges } : {}),
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError("This transaction is already linked to a goal contribution");
    }
    throw error;
  }
  return presentGoal(context, goal);
}

/**
 * Brings the transfer behind a contribution in line with it: the side in the goal's currency takes the
 * converted amount, the side in the original currency the original amount, and the transfer moves to the
 * contribution's day. Skipped when the link is not a transfer between two known accounts.
 */
export async function syncLinkedTransfer(
  context: HouseholdContext,
  row: GoalContributionRecord,
  input: {
    transactionId: string;
    day: Date;
    goalCurrencyCode: string;
    goalAmount: number;
    original: { amount: number; currencyCode: string } | null;
  },
): Promise<void> {
  if (!row.fromAccountId || !row.toAccountId) return;
  if (!(await isLinkedTransfer(context, input.transactionId))) return;
  const [from, to] = await Promise.all([
    requireCashAccount(context, row.fromAccountId),
    requireCashAccount(context, row.toAccountId),
  ]);
  const amounts = transferAmounts(from.currencyId, to.currencyId, {
    amount: input.goalAmount,
    currencyCode: input.goalCurrencyCode,
    ...(input.original ? { counterpart: input.original } : {}),
  });
  if (!amounts) return;
  await transactionsService.updateTransaction(context, input.transactionId, {
    ...amounts,
    purchaseDate: input.day,
    postedDate: input.day,
  });
}

export async function removeContribution(
  context: HouseholdContext,
  goalId: string,
  contributionId: string,
): Promise<GoalDetail> {
  const goal = await requireGoal(context, goalId);
  await assertGoalNotLinked(goal.id);
  await requireContribution(goalId, contributionId);
  await goalsRepository.deleteContribution(contributionId);
  return presentGoal(context, goal);
}

/** Resolves the rate (explicit or historical for `day`) and converts `amount` once, at the end. */
async function convertContribution(input: {
  amount: number;
  from: string;
  to: string;
  day: Date;
  fxRate?: number | null | undefined;
}): Promise<{ amount: number; rate: ContributionRate }> {
  const rate = await resolveContributionRate({
    from: input.from,
    to: input.to,
    day: input.day,
    fxRate: input.fxRate,
  });
  const amount = await convertWithContributionRate({
    amount: input.amount,
    rate: rate.rate,
    from: input.from,
    to: input.to,
  });
  return { amount, rate };
}

/** The columns that record a rate on a contribution row (all null for a same-currency one). */
function fxColumns(rate: ContributionRate | null) {
  return {
    fxRate: rate?.rate ?? null,
    fxRateSource: rate?.source ?? null,
    fxRateDate: rate?.rateDate ?? null,
  };
}

/** What a contribution in another currency would be worth on `day` (the web preview and the MCP dry run). */
export async function quoteContribution(
  context: HouseholdContext,
  query: z.output<typeof goalContributionQuoteQuerySchema>,
): Promise<GoalContributionQuote> {
  const day = query.date ? toDay(query.date) : getTodayInTimezone(context.timezone);
  const from = query.fromCurrencyCode.toUpperCase();
  const to = query.toCurrencyCode.toUpperCase();
  const { amount, rate } = await convertContribution({ amount: query.amount, from, to, day });
  return {
    fromCurrencyCode: from,
    toCurrencyCode: to,
    fxRate: Number(rate.rate),
    fxRateSource: rate.source,
    fxRateDate: formatISODate(rate.rateDate),
    requestedDate: formatISODate(day),
    originalAmount: query.amount,
    convertedAmount: amount,
  };
}

// ─── Funds: contribute, move, withdraw ───────────────────────────────────

async function requireCashAccount(context: HouseholdContext, accountId: string) {
  const account = await accountsRepository.get(accountId, context);
  if (!account) throw new NotFoundError("Account");
  return account;
}

/** The amount each side of a funds transfer takes, from what is known in `currencyCode` (and its counterpart). */
function transferAmounts(
  fromCurrencyCode: string,
  toCurrencyCode: string,
  input: {
    amount: number;
    currencyCode: string;
    counterpart?: { amount: number; currencyCode: string } | undefined;
  },
): { fromAmount?: number; toAmount?: number } | null {
  const amountIn = (currencyCode: string) =>
    currencyCode === input.currencyCode
      ? input.amount
      : currencyCode === input.counterpart?.currencyCode
        ? input.counterpart.amount
        : undefined;
  const fromAmount = amountIn(fromCurrencyCode);
  const toAmount = amountIn(toCurrencyCode);
  if (fromAmount === undefined && toAmount === undefined) return null;
  return {
    ...(fromAmount === undefined ? {} : { fromAmount }),
    ...(toAmount === undefined ? {} : { toAmount }),
  };
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
  const amounts = transferAmounts(from.currencyId, to.currencyId, input);
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
  await assertGoalNotLinked(goal.id);
  const currencyCode = body.currencyCode ?? goal.currencyCode;
  const foreign = currencyCode !== goal.currencyCode;
  const date = body.contributedOn
    ? toDay(body.contributedOn)
    : getTodayInTimezone(context.timezone);
  const converted = foreign
    ? await convertContribution({
        amount: body.amount,
        from: currencyCode,
        to: goal.currencyCode,
        day: date,
        fxRate: body.fxRate,
      })
    : null;
  const goalAmount = converted ? converted.amount : body.amount;
  if (goalAmount <= 0) throw new ValidationError("The converted amount must be more than zero");

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
    ...fxColumns(converted?.rate ?? null),
  });
  return presentGoal(context, goal);
}

export async function moveGoalFunds(
  context: HouseholdContext,
  goalId: string,
  body: MoveInput,
): Promise<GoalDetail> {
  const goal = await requireGoal(context, goalId);
  await assertGoalNotLinked(goal.id);
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
  await assertGoalNotLinked(goal.id);
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
  const linked = await loadLinkedProgress(context, goals);
  const linkedFlows = new Map<string, number>();
  for (const goal of goals) {
    const progress = linked.get(goal.id);
    if (progress) linkedFlows.set(goal.id, await linkedMonthFlow(context, goal, progress, key));
  }

  return {
    month: key,
    goals: goals.map((goal, index) => {
      const summary = summaries[index] as Goal;
      const inPlan =
        goal.status === "active" &&
        monthKey(goal.startDate) <= key &&
        (!goal.endMonth || monthKey(goal.endMonth) >= key);
      const contributed = linked.has(goal.id)
        ? (linkedFlows.get(goal.id) ?? 0)
        : rows
            .filter(
              (row) =>
                row.goalId === goal.id &&
                countsAsProgress(row) &&
                monthKey(row.contributedOn) === key,
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
