import {
  type CreateGoalInput,
  type GoalContribution,
  type GoalDetail,
  goalsEndpoints,
  type MonthlyPlanReport,
  monthlyPlansEndpoints,
} from "@luraba/contracts";
import { convertMinorUnitsWithRate } from "@luraba/domain";
import { z } from "zod";
import { fetchAllPages, PAGE_SIZE } from "../client/fetch-all.js";
import { currencyPrecision, majorToMinor, majorToMoney, toMoney } from "../format/money.js";
import { resolveByName } from "../resolve/match.js";
import { clarificationOutput, Problems } from "../resolve/problems.js";
import {
  DESTRUCTIVE,
  defineTool,
  IDEMPOTENT_WRITE,
  READ_ONLY,
  type ToolContext,
  type ToolOutput,
  WRITE,
} from "./types.js";

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM");
const GOAL_TYPES = ["investment", "savings"] as const;

function loadGoals(context: ToolContext) {
  return fetchAllPages((page) =>
    context.client.request(goalsEndpoints.list, { query: { page, perPage: PAGE_SIZE } }),
  );
}

/** A goal named or identified by the agent; ambiguity goes back as `needs_clarification`. */
async function resolveGoal(context: ToolContext, problems: Problems, query: string) {
  const goals = await loadGoals(context);
  const id = problems.take("goal", resolveByName(query, goals));
  return goals.find((goal) => goal.id === id);
}

async function accountNames(context: ToolContext): Promise<Map<string, string>> {
  return new Map((await context.refs.accounts()).map((account) => [account.id, account.name]));
}

function describeGoal(
  goal: GoalDetail | Awaited<ReturnType<typeof loadGoals>>[number],
  names: Map<string, string>,
) {
  const c = goal.currencyCode;
  return {
    id: goal.id,
    name: goal.name,
    type: goal.kind,
    status: goal.status,
    state: goal.state,
    currency: c,
    monthlyContribution:
      goal.monthlyContribution === null ? null : toMoney(goal.monthlyContribution, c),
    target: toMoney(goal.targetAmount, c),
    saved: toMoney(goal.saved, c),
    percent: goal.estimate.percent,
    startMonth: goal.startDate.slice(0, 7),
    endMonth: goal.endMonth,
    targetDate: goal.targetDate,
    notes: goal.description,
    whereTheMoneySits: goal.locations.map((location) => ({
      account: location.accountId ? (names.get(location.accountId) ?? "Unknown") : "Not assigned",
      amount: toMoney(location.amount, c),
    })),
  };
}

/** The rate as an agent reads it: up to 8 decimals, trailing zeros trimmed. */
const rateText = (rate: number) => String(Number(rate.toFixed(8)));

/** `R$5,495.41 -> $975.12 @ 0.17743941 on 2026-11-10`, plus the numbers behind it, all in major units. */
function describeConversion(input: {
  original: { amount: number; currency: string };
  converted: { amount: number; currency: string };
  fxRate: number;
  source: string | null;
  rateDate: string | null;
}) {
  const original = toMoney(input.original.amount, input.original.currency);
  const converted = toMoney(input.converted.amount, input.converted.currency);
  return {
    original,
    converted,
    fxRate: input.fxRate,
    fxRateSource: input.source,
    fxRateDate: input.rateDate,
    text: `${original.formatted} -> ${converted.formatted} @ ${rateText(input.fxRate)}${input.rateDate ? ` on ${input.rateDate}` : ""}`,
  };
}

/** One contribution row for an agent: major-unit money, and the conversion when it was in another currency. */
function describeContribution(row: GoalContribution, goalCurrency: string) {
  return {
    id: row.id,
    kind: row.kind,
    date: row.contributedOn,
    amount: toMoney(row.amount, goalCurrency),
    note: row.note,
    transferId: row.transaction?.id ?? null,
    conversion:
      row.originalCurrency && row.originalAmount !== null && row.fxRate !== null
        ? describeConversion({
            original: { amount: row.originalAmount, currency: row.originalCurrency },
            converted: { amount: row.amount, currency: goalCurrency },
            fxRate: row.fxRate,
            source: row.fxRateSource,
            rateDate: row.fxRateDate,
          })
        : null,
  };
}

function monthsInclusive(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number) as [number, number];
  const [ty, tm] = to.split("-").map(Number) as [number, number];
  return (ty - fy) * 12 + (tm - fm) + 1;
}

export const createGoal = defineTool({
  name: "create_goal",
  title: "Create a goal",
  description:
    'Create a savings or investment goal. Goals are NOT tied to an account: money can sit in any account (a bank savings pot, a brokerage) and progress is the sum of the goal\'s contributions minus withdrawals. type is "investment" or "savings". monthlyContribution is the planned amount per month (major units) between startMonth (default: this month) and endMonth (optional, YYYY-MM). targetAmount is optional: when omitted it is the planned total (monthlyContribution x months, needs endMonth). linkedAccount is optional and informational. Use this to set up a plan; use contribute_to_goal to record money actually put in. Use dryRun=true to preview.',
  input: z.object({
    name: z.string().min(1).max(255),
    type: z.enum(GOAL_TYPES),
    currency: z.string().length(3).optional().describe("Defaults to the household currency."),
    monthlyContribution: z.number().positive().optional(),
    targetAmount: z.number().positive().optional(),
    targetDate: z.iso.date().optional().describe("Alternative to monthlyContribution."),
    startMonth: monthSchema.optional(),
    endMonth: monthSchema.optional(),
    linkedAccount: z.string().optional().describe("Informational: an account name or id."),
    notes: z.string().max(2000).optional(),
    dryRun: z.boolean().default(false),
  }),
  annotations: WRITE,
  async handler(context, args): Promise<ToolOutput> {
    const problems = new Problems();
    const currency = (args.currency ?? (await context.refs.defaultCurrency())).toUpperCase();
    const linkedAccountId = args.linkedAccount
      ? problems.take("linkedAccount", await context.refs.resolveAccount(args.linkedAccount))
      : undefined;
    if (problems.any) return clarificationOutput(problems);

    const startMonth = args.startMonth ?? (await context.refs.today()).slice(0, 7);
    let targetMajor = args.targetAmount;
    if (targetMajor === undefined && args.monthlyContribution && args.endMonth) {
      targetMajor = args.monthlyContribution * monthsInclusive(startMonth, args.endMonth);
    }
    if (targetMajor === undefined) {
      return {
        isError: true,
        summary:
          "Give targetAmount, or monthlyContribution with endMonth so the total can be planned.",
        data: { status: "invalid_input", missing: "targetAmount" },
      };
    }
    const body = {
      name: args.name,
      kind: args.type,
      currencyCode: currency,
      targetAmount: majorToMinor(targetMajor, currency),
      startDate: `${startMonth}-01`,
      ...(args.monthlyContribution
        ? { monthlyContribution: majorToMinor(args.monthlyContribution, currency) }
        : {}),
      ...(args.targetDate ? { targetDate: args.targetDate } : {}),
      ...(args.endMonth ? { endMonth: args.endMonth } : {}),
      ...(linkedAccountId ? { accountId: linkedAccountId } : {}),
      ...(args.notes ? { description: args.notes } : {}),
    } as CreateGoalInput;

    if (args.dryRun) {
      return {
        summary: "Dry run: nothing was created.",
        data: { status: "dry_run", wouldCreate: body },
      };
    }
    const goal = await context.client.request(goalsEndpoints.create, { body });
    return {
      summary: `Created goal "${goal.name}" (${goal.kind}, ${majorToMoney(targetMajor, currency).formatted}).`,
      data: { status: "created", goal: describeGoal(goal, await accountNames(context)) },
    };
  },
});

export const updateGoal = defineTool({
  name: "update_goal",
  title: "Update a goal",
  description:
    "Change a goal's plan: name, type, monthlyContribution, targetAmount, targetDate, endMonth, notes, status (active, paused, canceled) or linked account. Pass only what changes; null clears targetDate, endMonth or linkedAccount. The goal's currency cannot change. Past contributions are not touched: edit the plan going forward only. Use dryRun=true to preview.",
  input: z.object({
    goal: z.string().describe("Goal name or id."),
    name: z.string().min(1).max(255).optional(),
    type: z.enum(GOAL_TYPES).optional(),
    monthlyContribution: z.number().positive().nullable().optional(),
    targetAmount: z.number().positive().optional(),
    targetDate: z.iso.date().nullable().optional(),
    endMonth: monthSchema.nullable().optional(),
    status: z.enum(["active", "paused", "canceled"]).optional(),
    linkedAccount: z.string().nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
    dryRun: z.boolean().default(false),
  }),
  annotations: IDEMPOTENT_WRITE,
  async handler(context, args): Promise<ToolOutput> {
    const problems = new Problems();
    const goal = await resolveGoal(context, problems, args.goal);
    const accountId =
      args.linkedAccount === undefined || args.linkedAccount === null
        ? args.linkedAccount
        : problems.take("linkedAccount", await context.refs.resolveAccount(args.linkedAccount));
    if (problems.any || !goal) return clarificationOutput(problems);

    const c = goal.currencyCode;
    const body = {
      ...(args.name ? { name: args.name } : {}),
      ...(args.type ? { kind: args.type } : {}),
      ...(args.monthlyContribution === undefined
        ? {}
        : {
            monthlyContribution:
              args.monthlyContribution === null ? null : majorToMinor(args.monthlyContribution, c),
          }),
      ...(args.targetAmount === undefined
        ? {}
        : { targetAmount: majorToMinor(args.targetAmount, c) }),
      ...(args.targetDate === undefined ? {} : { targetDate: args.targetDate }),
      ...(args.endMonth === undefined ? {} : { endMonth: args.endMonth }),
      ...(args.status ? { status: args.status } : {}),
      ...(accountId === undefined ? {} : { accountId }),
      ...(args.notes === undefined ? {} : { description: args.notes }),
    };
    if (Object.keys(body).length === 0) {
      return {
        isError: true,
        summary: "Nothing to change: pass at least one field.",
        data: { status: "invalid_input" },
      };
    }
    if (args.dryRun) {
      return {
        summary: "Dry run: nothing was changed.",
        data: { status: "dry_run", wouldUpdate: body },
      };
    }
    const updated = await context.client.request(goalsEndpoints.update, {
      params: { id: goal.id },
      body,
    });
    return {
      summary: `Updated goal "${updated.name}".`,
      data: { status: "updated", goal: describeGoal(updated, await accountNames(context)) },
    };
  },
});

export const listGoals = defineTool({
  name: "list_goals",
  title: "List goals",
  description:
    "List the goals with plan, saved amount, percent, state and where each goal's money currently sits (by account). Pass goal (name or id) with includeContributions=true to also list that goal's contributions with their ids, original amounts and the exchange rate used (needed by update_goal_contribution). Use report_goals for this month's contributed-vs-planned numbers and on-track status.",
  input: z.object({
    status: z.enum(["active", "paused", "canceled"]).optional(),
    type: z.enum(GOAL_TYPES).optional(),
    goal: z.string().optional().describe("Only this goal (name or id)."),
    includeContributions: z
      .boolean()
      .default(false)
      .describe("With goal: list its contributions, withdrawals and moves."),
  }),
  annotations: READ_ONLY,
  async handler(context, args): Promise<ToolOutput> {
    const problems = new Problems();
    const only = args.goal ? await resolveGoal(context, problems, args.goal) : undefined;
    if (problems.any || (args.goal && !only)) return clarificationOutput(problems);
    const goals = (await loadGoals(context)).filter(
      (goal) =>
        (!only || goal.id === only.id) &&
        (!args.status || goal.status === args.status) &&
        (!args.type || goal.kind === args.type),
    );
    const names = await accountNames(context);
    const contributions =
      only && args.includeContributions
        ? (await context.client.request(goalsEndpoints.get, { params: { id: only.id } }))
            .contributions
        : null;
    return {
      summary: `${goals.length} goal(s).`,
      data: {
        goals: goals.map((goal) => ({
          ...describeGoal(goal, names),
          ...(contributions
            ? {
                contributions: contributions.map((row) =>
                  describeContribution(row, goal.currencyCode),
                ),
              }
            : {}),
        })),
      },
    };
  },
});

export const deleteGoal = defineTool({
  name: "delete_goal",
  title: "Delete a goal",
  description:
    "Permanently delete a goal and its contribution history. Transfers and expenses already recorded stay. Prefer update_goal with status canceled or paused to keep the history. Requires confirm=true; without it nothing is deleted and the goal is shown.",
  input: z.object({
    goal: z.string().describe("Goal name or id."),
    confirm: z.boolean().default(false),
  }),
  annotations: DESTRUCTIVE,
  async handler(context, args): Promise<ToolOutput> {
    const problems = new Problems();
    const goal = await resolveGoal(context, problems, args.goal);
    if (problems.any || !goal) return clarificationOutput(problems);
    if (!args.confirm) {
      return {
        summary: `Not deleted: confirm=true is required to delete "${goal.name}" (${goal.contributionCount} contribution(s), saved ${toMoney(goal.saved, goal.currencyCode).formatted}).`,
        data: { status: "confirmation_required", goal: { id: goal.id, name: goal.name } },
      };
    }
    await context.client.request(goalsEndpoints.delete, { params: { id: goal.id } });
    return { summary: `Deleted goal "${goal.name}".`, data: { status: "deleted", id: goal.id } };
  },
});

async function accountId(
  context: ToolContext,
  problems: Problems,
  field: string,
  query: string | undefined,
) {
  return query ? problems.take(field, await context.refs.resolveAccount(query)) : undefined;
}

export const contributeToGoal = defineTool({
  name: "contribute_to_goal",
  title: "Put money toward a goal",
  description:
    "Record money put toward a goal: creates a transfer from fromAccount to toAccount (neutral in spending and income) and adds the amount to the goal's progress. Use when the user says they saved or invested money for a goal. toAccount is where the money now sits (a savings pot, a brokerage). Pass transferId to link an existing transfer instead of creating one. If amount is in another currency than the goal's, it is converted with fxRate (goal units per 1 of that currency, any number of decimals, used exactly as given) or, when fxRate is left out, with the historical rate for the contribution date (the closest previous business day; never today's rate for a past date; an error asks for fxRate when none exists). The original amount, the converted amount, the rate, its source and its day are stored and returned. Amount is positive, in major units; date defaults to today. Use dryRun=true to preview the conversion.",
  input: z.object({
    goal: z.string().describe("Goal name or id."),
    amount: z.number().positive(),
    currency: z.string().length(3).optional().describe("Defaults to the goal's currency."),
    fxRate: z
      .number()
      .positive()
      .optional()
      .describe("Goal units per 1 of `currency`. Leave out to use the date's historical rate."),
    date: z.iso.date().optional(),
    fromAccount: z.string(),
    toAccount: z.string(),
    transferId: z.uuid().optional(),
    note: z.string().max(500).optional(),
    dryRun: z.boolean().default(false),
  }),
  annotations: WRITE,
  async handler(context, args): Promise<ToolOutput> {
    const problems = new Problems();
    const goal = await resolveGoal(context, problems, args.goal);
    const fromAccountId = await accountId(context, problems, "fromAccount", args.fromAccount);
    const toAccountId = await accountId(context, problems, "toAccount", args.toAccount);
    if (problems.any || !goal || !fromAccountId || !toAccountId)
      return clarificationOutput(problems);

    const currency = (args.currency ?? goal.currencyCode).toUpperCase();
    const foreign = currency !== goal.currencyCode;
    const body = {
      amount: majorToMinor(args.amount, currency),
      ...(foreign
        ? { currencyCode: currency, ...(args.fxRate === undefined ? {} : { fxRate: args.fxRate }) }
        : {}),
      ...(args.date ? { contributedOn: args.date } : {}),
      fromAccountId,
      toAccountId,
      ...(args.transferId ? { transactionId: args.transferId } : {}),
      ...(args.note ? { note: args.note } : {}),
    };
    if (args.dryRun) {
      let conversion: ReturnType<typeof describeConversion> | null = null;
      if (foreign) {
        const quote =
          args.fxRate === undefined
            ? await context.client.request(goalsEndpoints.contributionQuote, {
                query: {
                  fromCurrencyCode: currency,
                  toCurrencyCode: goal.currencyCode,
                  ...(args.date ? { date: args.date } : {}),
                  amount: body.amount,
                },
              })
            : null;
        conversion = describeConversion({
          original: { amount: body.amount, currency },
          converted: {
            amount:
              quote?.convertedAmount ??
              convertMinorUnitsWithRate(
                body.amount,
                args.fxRate as number,
                currencyPrecision(currency),
                currencyPrecision(goal.currencyCode),
              ),
            currency: goal.currencyCode,
          },
          fxRate: quote?.fxRate ?? (args.fxRate as number),
          source: quote?.fxRateSource ?? "manual",
          rateDate: quote?.fxRateDate ?? args.date ?? null,
        });
      }
      return {
        summary: `Dry run: nothing was recorded.${conversion ? ` ${conversion.text}.` : ""}`,
        data: {
          status: "dry_run",
          goal: goal.name,
          wouldRecord: {
            amount: majorToMoney(args.amount, currency),
            countsTowardGoal: conversion?.converted ?? majorToMoney(args.amount, currency),
            date: args.date ?? "today",
            fromAccount: args.fromAccount,
            toAccount: args.toAccount,
            transferId: args.transferId ?? null,
            note: args.note ?? null,
            conversion,
          },
        },
      };
    }
    const updated = await context.client.request(goalsEndpoints.contribute, {
      params: { id: goal.id },
      body,
    });
    context.refs.invalidate();
    const contribution = updated.contributions.at(-1);
    const shown = contribution ? describeContribution(contribution, updated.currencyCode) : null;
    return {
      summary: `Added ${shown?.conversion?.text ?? majorToMoney(args.amount, currency).formatted} to "${goal.name}". Saved: ${toMoney(updated.saved, updated.currencyCode).formatted}.`,
      data: {
        status: "recorded",
        goal: describeGoal(updated, await accountNames(context)),
        contribution: shown,
      },
    };
  },
});

export const updateGoalContribution = defineTool({
  name: "update_goal_contribution",
  title: "Fix a goal contribution",
  description:
    "Correct a past contribution to a goal: its amount, date, exchange rate or note. Find the contribution id with list_goals (goal + includeContributions=true). For a contribution made in another currency, amount is in that ORIGINAL currency (for example BRL), and the converted amount is recomputed: with recompute=true (default) the historical rate for the (new) date is looked up again, unless fxRate is given, which is used exactly as typed (goal units per 1 of the original currency, any number of decimals). recompute=false keeps the stored rate. The goal's saved total, its per-account locations and the transfer behind the contribution are updated together. Use dryRun=true to see before and after.",
  input: z.object({
    goal: z.string().describe("Goal name or id."),
    contribution: z.uuid().describe("Contribution id from list_goals."),
    amount: z
      .number()
      .positive()
      .optional()
      .describe("New amount in major units, in the contribution's original currency."),
    date: z.iso.date().optional(),
    fxRate: z.number().positive().optional(),
    recompute: z
      .boolean()
      .default(true)
      .describe("Look up the date's historical rate again (ignored when fxRate is given)."),
    note: z.string().max(500).optional(),
    dryRun: z.boolean().default(false),
  }),
  annotations: IDEMPOTENT_WRITE,
  async handler(context, args): Promise<ToolOutput> {
    const problems = new Problems();
    const goal = await resolveGoal(context, problems, args.goal);
    if (problems.any || !goal) return clarificationOutput(problems);
    const detail = await context.client.request(goalsEndpoints.get, { params: { id: goal.id } });
    const current = detail.contributions.find((row) => row.id === args.contribution);
    if (!current) {
      return {
        isError: true,
        summary: `"${goal.name}" has no contribution ${args.contribution}. Use list_goals with includeContributions=true.`,
        data: { status: "not_found", contribution: args.contribution },
      };
    }
    const foreign = current.kind === "contribution" && current.originalCurrency !== null;
    if (!foreign && args.fxRate !== undefined) {
      return {
        isError: true,
        summary: "That contribution is in the goal's currency; it has no exchange rate.",
        data: { status: "invalid_input", field: "fxRate" },
      };
    }
    const currency = foreign ? (current.originalCurrency as string) : goal.currencyCode;
    const body = {
      ...(args.amount === undefined ? {} : { amount: majorToMinor(args.amount, currency) }),
      ...(args.date ? { contributedOn: args.date } : {}),
      ...(args.fxRate === undefined ? {} : { fxRate: args.fxRate }),
      ...(foreign ? { recompute: args.recompute } : {}),
      ...(args.note === undefined ? {} : { note: args.note }),
    };
    // A foreign contribution with nothing else given is a plain "recompute at the date's rate".
    if (Object.keys(body).length === 0) {
      return {
        isError: true,
        summary: "Nothing to change: give amount, date, fxRate or note.",
        data: { status: "invalid_input" },
      };
    }

    const before = describeContribution(current, goal.currencyCode);
    if (args.dryRun) {
      let after = before;
      if (foreign && current.originalAmount !== null && current.fxRate !== null) {
        const originalAmount = body.amount ?? current.originalAmount;
        const day = args.date ?? current.contributedOn;
        const quote =
          args.fxRate === undefined && args.recompute
            ? await context.client.request(goalsEndpoints.contributionQuote, {
                query: {
                  fromCurrencyCode: currency,
                  toCurrencyCode: goal.currencyCode,
                  date: day,
                  amount: originalAmount,
                },
              })
            : null;
        const rate = quote?.fxRate ?? args.fxRate ?? current.fxRate;
        const converted =
          quote?.convertedAmount ??
          convertMinorUnitsWithRate(
            originalAmount,
            rate,
            currencyPrecision(currency),
            currencyPrecision(goal.currencyCode),
          );
        after = {
          ...before,
          date: day,
          amount: toMoney(converted, goal.currencyCode),
          conversion: describeConversion({
            original: { amount: originalAmount, currency },
            converted: { amount: converted, currency: goal.currencyCode },
            fxRate: rate,
            source: quote
              ? quote.fxRateSource
              : args.fxRate === undefined
                ? current.fxRateSource
                : "manual",
            rateDate: quote
              ? quote.fxRateDate
              : args.fxRate === undefined
                ? current.fxRateDate
                : day,
          }),
        };
      } else {
        after = {
          ...before,
          date: args.date ?? before.date,
          amount: args.amount === undefined ? before.amount : majorToMoney(args.amount, currency),
        };
      }
      return {
        summary: `Dry run: nothing was changed. ${before.conversion?.text ?? before.amount.formatted} => ${after.conversion?.text ?? after.amount.formatted}.`,
        data: { status: "dry_run", goal: goal.name, before, after },
      };
    }

    const updated = await context.client.request(goalsEndpoints.updateContribution, {
      params: { id: goal.id, contributionId: current.id },
      body,
    });
    context.refs.invalidate();
    const row = updated.contributions.find((item) => item.id === current.id);
    const after = row ? describeContribution(row, updated.currencyCode) : null;
    return {
      summary: `Updated the contribution to "${goal.name}": ${after?.conversion?.text ?? after?.amount.formatted}. Saved: ${toMoney(updated.saved, updated.currencyCode).formatted}.`,
      data: {
        status: "updated",
        before,
        after,
        goal: describeGoal(updated, await accountNames(context)),
      },
    };
  },
});

export const moveGoalFunds = defineTool({
  name: "move_goal_funds",
  title: "Move a goal's money between accounts",
  description:
    "Move money that belongs to a goal from one account to another (for example a savings pot to a brokerage) with a transfer. The goal's progress does not change, only where the money sits. Fails when fromAccount holds less of this goal than the amount (see list_goals, whereTheMoneySits). Amount is in the goal's currency, major units. Use dryRun=true to preview.",
  input: z.object({
    goal: z.string(),
    amount: z.number().positive(),
    fromAccount: z.string(),
    toAccount: z.string(),
    date: z.iso.date().optional(),
    transferId: z.uuid().optional(),
    note: z.string().max(500).optional(),
    dryRun: z.boolean().default(false),
  }),
  annotations: WRITE,
  async handler(context, args): Promise<ToolOutput> {
    const problems = new Problems();
    const goal = await resolveGoal(context, problems, args.goal);
    const fromAccountId = await accountId(context, problems, "fromAccount", args.fromAccount);
    const toAccountId = await accountId(context, problems, "toAccount", args.toAccount);
    if (problems.any || !goal || !fromAccountId || !toAccountId)
      return clarificationOutput(problems);

    const body = {
      amount: majorToMinor(args.amount, goal.currencyCode),
      fromAccountId,
      toAccountId,
      ...(args.date ? { contributedOn: args.date } : {}),
      ...(args.transferId ? { transactionId: args.transferId } : {}),
      ...(args.note ? { note: args.note } : {}),
    };
    if (args.dryRun) {
      return {
        summary: "Dry run: nothing was moved.",
        data: {
          status: "dry_run",
          goal: goal.name,
          wouldMove: {
            amount: majorToMoney(args.amount, goal.currencyCode),
            fromAccount: args.fromAccount,
            toAccount: args.toAccount,
            date: args.date ?? "today",
            transferId: args.transferId ?? null,
            note: args.note ?? null,
          },
        },
      };
    }
    const updated = await context.client.request(goalsEndpoints.moveFunds, {
      params: { id: goal.id },
      body,
    });
    context.refs.invalidate();
    return {
      summary: `Moved ${majorToMoney(args.amount, goal.currencyCode).formatted} of "${goal.name}" from ${args.fromAccount} to ${args.toAccount}. Progress is unchanged.`,
      data: { status: "moved", goal: describeGoal(updated, await accountNames(context)) },
    };
  },
});

export const withdrawFromGoal = defineTool({
  name: "withdraw_from_goal",
  title: "Take money out of a goal",
  description:
    "Take money out of a goal, which lowers its progress. Two ways: (1) the goal paid for something: pass expenseId (an expense from search_transactions, for example the honeymoon hotel); the amount defaults to the expense amount; (2) the money goes back to an account: pass toAccount (creates a transfer, neutral in spending). fromAccount is where the goal's money was. Amount is in the goal's currency, major units. Use dryRun=true to preview.",
  input: z.object({
    goal: z.string(),
    amount: z.number().positive().optional(),
    fromAccount: z.string(),
    toAccount: z.string().optional(),
    expenseId: z.uuid().optional(),
    date: z.iso.date().optional(),
    note: z.string().max(500).optional(),
    dryRun: z.boolean().default(false),
  }),
  annotations: WRITE,
  async handler(context, args): Promise<ToolOutput> {
    const problems = new Problems();
    const goal = await resolveGoal(context, problems, args.goal);
    const fromAccountId = await accountId(context, problems, "fromAccount", args.fromAccount);
    const toAccountId = await accountId(context, problems, "toAccount", args.toAccount);
    if (problems.any || !goal || !fromAccountId) return clarificationOutput(problems);
    if (!args.expenseId && !toAccountId) {
      return {
        isError: true,
        summary: "Give expenseId (what the money paid for) or toAccount (where it goes).",
        data: { status: "invalid_input", missing: "expenseId or toAccount" },
      };
    }
    const body = {
      fromAccountId,
      ...(args.amount === undefined
        ? {}
        : { amount: majorToMinor(args.amount, goal.currencyCode) }),
      ...(toAccountId ? { toAccountId } : {}),
      ...(args.expenseId ? { expenseId: args.expenseId } : {}),
      ...(args.date ? { contributedOn: args.date } : {}),
      ...(args.note ? { note: args.note } : {}),
    };
    if (args.dryRun) {
      return {
        summary: "Dry run: nothing was withdrawn.",
        data: {
          status: "dry_run",
          goal: goal.name,
          wouldWithdraw: {
            amount: args.amount === undefined ? null : majorToMoney(args.amount, goal.currencyCode),
            fromAccount: args.fromAccount,
            toAccount: args.toAccount ?? null,
            expenseId: args.expenseId ?? null,
            date: args.date ?? "today",
            note: args.note ?? null,
          },
        },
      };
    }
    const updated = await context.client.request(goalsEndpoints.withdraw, {
      params: { id: goal.id },
      body,
    });
    context.refs.invalidate();
    const row = updated.contributions[0];
    return {
      summary: `Took ${toMoney(Math.abs(row?.amount ?? 0), goal.currencyCode).formatted} out of "${goal.name}". Saved: ${toMoney(updated.saved, updated.currencyCode).formatted}.`,
      data: { status: "withdrawn", goal: describeGoal(updated, await accountNames(context)) },
    };
  },
});

const PLAN_LINE_KINDS = ["salary", "taxes", "goal", "to_spend"] as const;

export const setMonthlyPlan = defineTool({
  name: "set_monthly_plan",
  title: "Set the monthly plan",
  description:
    'Set the PROJECTED monthly plan for a month or a range of months (competency months: salary received on the 22nd belongs to the NEXT month). Replaces all lines of those months. lines: {kind: "salary"|"taxes", amount}, {kind: "goal", goal: <name or id>, amount} for each goal contribution, and optionally {kind: "to_spend", amount}; when to_spend is omitted it is salary - taxes - all goal contributions. Amounts are major units in `currency` (default: the household currency). Use report_monthly_plan to compare with what actually happened. Use dryRun=true to preview.',
  input: z.object({
    from: monthSchema.describe("First month, YYYY-MM."),
    to: monthSchema.optional().describe("Last month; defaults to `from`."),
    currency: z.string().length(3).optional(),
    lines: z
      .array(
        z.object({
          kind: z.enum(PLAN_LINE_KINDS),
          goal: z.string().optional().describe("Goal name or id, for kind=goal."),
          amount: z.number().min(0),
        }),
      )
      .min(1)
      .max(60),
    dryRun: z.boolean().default(false),
  }),
  annotations: IDEMPOTENT_WRITE,
  async handler(context, args): Promise<ToolOutput> {
    const problems = new Problems();
    const currency = (args.currency ?? (await context.refs.defaultCurrency())).toUpperCase();
    const goals = await loadGoals(context);
    const lines: { kind: (typeof PLAN_LINE_KINDS)[number]; goalId?: string; amount: number }[] = [];
    for (const line of args.lines) {
      if (line.kind === "goal") {
        if (!line.goal) {
          return {
            isError: true,
            summary: "Goal lines need a goal name or id.",
            data: { status: "invalid_input", missing: "goal" },
          };
        }
        const id = problems.take("goal", resolveByName(line.goal, goals));
        if (id)
          lines.push({ kind: "goal", goalId: id, amount: majorToMinor(line.amount, currency) });
      } else {
        lines.push({ kind: line.kind, amount: majorToMinor(line.amount, currency) });
      }
    }
    if (problems.any) return clarificationOutput(problems);
    const body = { from: args.from, to: args.to, currencyCode: currency, lines };
    if (args.dryRun) {
      return {
        summary: "Dry run: nothing was saved.",
        data: { status: "dry_run", wouldSet: body },
      };
    }
    const report = await context.client.request(monthlyPlansEndpoints.set, { body });
    return {
      summary: `Plan set for ${args.from}${args.to && args.to !== args.from ? ` to ${args.to}` : ""}.`,
      data: { status: "saved", ...presentPlan(report) },
    };
  },
});

function presentPlan(report: MonthlyPlanReport) {
  const c = report.currencyCode;
  const fx = report.fx;
  const money = (minor: number) => ({
    ...toMoney(minor, c),
    ...(fx ? { [`approx${fx.to}`]: toMoney(Math.round(minor * fx.rate), fx.to).formatted } : {}),
  });
  return {
    currency: c,
    fxRateUsed: fx ? `1 ${fx.from} = ${fx.rate} ${fx.to} (${fx.rateDate})` : null,
    months: report.months.map((month) => ({
      month: month.month,
      hasPlan: month.hasPlan,
      salaryReceivedOn: month.salaryReceivedOn,
      lines: month.lines.map((line) => ({
        line: line.label,
        projected: money(line.projected),
        actual: money(line.actual),
        difference: money(line.difference),
      })),
      investmentsTotal: {
        projected: money(month.investments.projected),
        actual: money(month.investments.actual),
      },
      savedTotal: { projected: money(month.saved.projected), actual: money(month.saved.actual) },
    })),
  };
}

export const reportMonthlyPlan = defineTool({
  name: "report_monthly_plan",
  title: "Monthly plan: projected vs actual",
  description:
    'Projected vs actual for every line of the monthly plan, for a month or a range (competency months: salary received on the 22nd counts for the NEXT month). Lines: Salary (income in "Salary & Contracts", with the date received), Taxes (expenses in "Business Taxes (DAS)"), one line per goal (contributions minus withdrawals dated in the month), and To spend (actual = the month\'s spending, net of refunds, without taxes). Also totals for investment goals and savings goals. Amounts are in the plan currency with an approximate value in the household currency and the FX rate used. Use this to answer "how am I doing vs plan this month?". Defaults to the current month.',
  input: z.object({ from: monthSchema.optional(), to: monthSchema.optional() }),
  annotations: READ_ONLY,
  async handler(context, args): Promise<ToolOutput> {
    const from = args.from ?? (await context.refs.today()).slice(0, 7);
    const report = await context.client.request(monthlyPlansEndpoints.report, {
      query: { from, ...(args.to ? { to: args.to } : {}) },
    });
    const missing = report.months.filter((month) => !month.hasPlan).map((month) => month.month);
    return {
      summary: `Plan vs actual for ${from}${args.to && args.to !== from ? ` to ${args.to}` : ""}.${missing.length ? ` No plan set for ${missing.join(", ")}: use set_monthly_plan.` : ""}`,
      data: presentPlan(report),
    };
  },
});
