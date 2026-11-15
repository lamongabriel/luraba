import {
  goalsEndpoints,
  type PiggyBank,
  type PiggyBankDetail,
  type PiggyBankOperation,
  piggyBanksEndpoints,
} from "@luraba/contracts";
import { z } from "zod";
import { fetchAllPages, PAGE_SIZE } from "../client/fetch-all.js";
import { majorToMinor, majorToMoney, toMoney } from "../format/money.js";
import { resolveByName } from "../resolve/match.js";
import { clarificationOutput, Problems } from "../resolve/problems.js";
import {
  DESTRUCTIVE,
  defineTool,
  READ_ONLY,
  type ToolContext,
  type ToolOutput,
  WRITE,
} from "./types.js";

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM");

const yieldSchema = z
  .object({
    type: z.enum(["cdi_percent", "selic_percent", "ipca_plus", "fixed_rate", "none"]),
    rate: z
      .number()
      .min(0)
      .describe(
        "A percentage: 102 = 102% of CDI, 6.5 = IPCA + 6.5% a.a., 12 = 12% a.a. fixed. Ignored for none.",
      ),
    dayCount: z.union([z.literal(252), z.literal(365)]).optional(),
    maturityDate: z.iso.date().nullable().optional(),
    liquidity: z.enum(["daily", "at_maturity"]).optional(),
    taxRegime: z.enum(["none", "regressive_ir"]).optional(),
    applyIof: z.boolean().optional(),
  })
  .describe("How the piggy bank earns interest. Omit for a bucket that earns nothing.");

async function loadPiggyBanks(context: ToolContext, includeArchived = false) {
  return context.client.request(piggyBanksEndpoints.list, { query: { includeArchived } });
}

/** A piggy bank named or identified by the agent; ambiguity goes back as `needs_clarification`. */
async function resolvePiggyBank(
  context: ToolContext,
  problems: Problems,
  label: string,
  query: string,
  includeArchived = false,
): Promise<PiggyBank | undefined> {
  const { piggyBanks } = await loadPiggyBanks(context, includeArchived);
  const items = piggyBanks.map((piggy) => ({ ...piggy, name: piggy.title }));
  const id = problems.take(label, resolveByName(query, items));
  return piggyBanks.find((piggy) => piggy.id === id);
}

async function accountId(
  context: ToolContext,
  problems: Problems,
  label: string,
  query: string | undefined,
): Promise<string | undefined> {
  if (!query) return undefined;
  return problems.take(label, await context.refs.resolveAccount(query));
}

function describe(piggy: PiggyBank | PiggyBankDetail) {
  const c = piggy.currencyCode;
  return {
    id: piggy.id,
    title: piggy.title,
    account: piggy.parentAccountName,
    currency: c,
    balance: toMoney(piggy.balance, c),
    yield: piggy.yield.label,
    maturityDate: piggy.yield.maturityDate,
    earnedThisMonth: toMoney(piggy.monthEarnings, c),
    unallocated: piggy.isUnallocated,
    goals: piggy.goals.map((goal) => goal.name),
    archived: piggy.archivedAt !== null,
    ...("netIfWithdrawn" in piggy
      ? {
          netIfWithdrawn: toMoney(piggy.netIfWithdrawn.net, c),
          earnedAllTime: toMoney(piggy.earnings.allTime, c),
        }
      : {}),
  };
}

function describeOperation(operation: PiggyBankOperation) {
  return {
    piggyBanks: operation.piggyBanks.map(describe),
    transactionId: operation.transactionId,
    adjustment: operation.adjustment,
  };
}

export const listPiggyBanks = defineTool({
  name: "list_piggy_banks",
  title: "List piggy banks",
  description:
    "List the household's piggy banks (savings buckets inside an account, like Nubank Caixinhas): balance, yield, month earnings, linked goals, plus per account the real balance, the free part (not in any piggy bank) and the piggy total. Filter by account or goal. Archived ones only with includeArchived.",
  input: z.object({
    account: z.string().optional().describe("An account name or id."),
    goal: z.string().optional().describe("A goal name or id: only piggy banks linked to it."),
    includeArchived: z.boolean().default(false),
  }),
  annotations: READ_ONLY,
  async handler(context, args): Promise<ToolOutput> {
    const problems = new Problems();
    const parentAccountId = await accountId(context, problems, "account", args.account);
    let goalId: string | undefined;
    if (args.goal) {
      const goals = await fetchAllPages((page) =>
        context.client.request(goalsEndpoints.list, { query: { page, perPage: PAGE_SIZE } }),
      );
      goalId = problems.take("goal", resolveByName(args.goal, goals));
    }
    if (problems.any) return clarificationOutput(problems);
    const overview = await context.client.request(piggyBanksEndpoints.list, {
      query: {
        includeArchived: args.includeArchived,
        ...(parentAccountId ? { parentAccountId } : {}),
        ...(goalId ? { goalId } : {}),
      },
    });
    return {
      summary: `${overview.piggyBanks.length} piggy bank(s).`,
      data: {
        accounts: overview.accounts.map((a) => ({
          account: a.name,
          currency: a.currencyCode,
          balance: toMoney(a.balance, a.currencyCode),
          free: toMoney(a.free, a.currencyCode),
          inPiggyBanks: toMoney(a.piggyTotal, a.currencyCode),
        })),
        piggyBanks: overview.piggyBanks.map(describe),
      },
    };
  },
});

export const createPiggyBank = defineTool({
  name: "create_piggy_bank",
  title: "Create a piggy bank",
  description:
    "Create a piggy bank (a named bucket) inside a cash account. The account must be a cash account; the piggy bank uses its currency. yield sets how it earns (CDI %, Selic %, IPCA + rate, fixed rate or none), with optional maturityDate, liquidity, taxRegime and applyIof. initialBalance (major units) is taken from the account's free balance, no transfer. Interest then accrues daily. Use dryRun=true to preview.",
  input: z.object({
    title: z.string().min(1).max(255),
    account: z.string().describe("The parent cash account: a name or id."),
    description: z.string().max(2000).optional(),
    emoji: z.string().max(16).optional(),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
    yield: yieldSchema.optional(),
    initialBalance: z.number().min(0).optional(),
    dryRun: z.boolean().default(false),
  }),
  annotations: WRITE,
  async handler(context, args): Promise<ToolOutput> {
    const problems = new Problems();
    const parentAccountId = await accountId(context, problems, "account", args.account);
    if (problems.any || !parentAccountId) return clarificationOutput(problems);
    const account = (await context.refs.accounts()).find((a) => a.id === parentAccountId);
    const currency = account?.currencyCode ?? (await context.refs.defaultCurrency());
    const body = {
      parentAccountId,
      title: args.title,
      ...(args.description ? { description: args.description } : {}),
      ...(args.emoji ? { emoji: args.emoji } : {}),
      ...(args.color ? { color: args.color } : {}),
      ...(args.yield ? { yield: args.yield } : {}),
      ...(args.initialBalance
        ? { initialBalance: majorToMinor(args.initialBalance, currency) }
        : {}),
    };
    if (args.dryRun) {
      return {
        summary: "Dry run: nothing was created.",
        data: { status: "dry_run", wouldCreate: body },
      };
    }
    const created = await context.client.request(piggyBanksEndpoints.create, { body });
    context.refs.invalidate();
    return {
      summary: `Created piggy bank "${created.title}" in ${created.parentAccountName}.`,
      data: { status: "created", piggyBank: describe(created) },
    };
  },
});

export const updatePiggyBank = defineTool({
  name: "update_piggy_bank",
  title: "Update a piggy bank",
  description:
    "Change a piggy bank's title, description, emoji, color or yield (for example a new CDI percentage or maturity date). Only the fields you pass change. Interest already credited is not rewritten. Use dryRun=true to preview.",
  input: z.object({
    piggyBank: z.string().describe("A piggy bank title or id."),
    title: z.string().min(1).max(255).optional(),
    description: z.string().max(2000).nullable().optional(),
    emoji: z.string().max(16).nullable().optional(),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .nullable()
      .optional(),
    yield: yieldSchema.optional(),
    dryRun: z.boolean().default(false),
  }),
  annotations: WRITE,
  async handler(context, args): Promise<ToolOutput> {
    const problems = new Problems();
    const piggy = await resolvePiggyBank(context, problems, "piggyBank", args.piggyBank);
    if (problems.any || !piggy) return clarificationOutput(problems);
    const { piggyBank: _p, dryRun: _d, ...changes } = args;
    const body = Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined));
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
        data: { status: "dry_run", piggyBank: piggy.title, wouldChange: body },
      };
    }
    const updated = await context.client.request(piggyBanksEndpoints.update, {
      params: { id: piggy.id },
      body,
    });
    return {
      summary: `Updated "${updated.title}".`,
      data: { status: "updated", piggyBank: describe(updated) },
    };
  },
});

export const archivePiggyBank = defineTool({
  name: "archive_piggy_bank",
  title: "Archive a piggy bank",
  description:
    "Archive a piggy bank. Only possible when its balance is zero (move or withdraw the money first). Requires confirm=true; with dryRun=true it only checks.",
  input: z.object({
    piggyBank: z.string().describe("A piggy bank title or id."),
    confirm: z.boolean().default(false),
    dryRun: z.boolean().default(false),
  }),
  annotations: DESTRUCTIVE,
  async handler(context, args): Promise<ToolOutput> {
    const problems = new Problems();
    const piggy = await resolvePiggyBank(context, problems, "piggyBank", args.piggyBank);
    if (problems.any || !piggy) return clarificationOutput(problems);
    if (args.dryRun || !args.confirm) {
      return {
        summary:
          piggy.balance === 0
            ? `Dry run: "${piggy.title}" is empty and can be archived. Call again with confirm=true.`
            : `"${piggy.title}" holds ${toMoney(piggy.balance, piggy.currencyCode).formatted}: empty it before archiving.`,
        data: {
          status: args.dryRun ? "dry_run" : "confirmation_required",
          canArchive: piggy.balance === 0,
        },
        ...(args.dryRun ? {} : { isError: true }),
      };
    }
    const archived = await context.client.request(piggyBanksEndpoints.archive, {
      params: { id: piggy.id },
    });
    context.refs.invalidate();
    return {
      summary: `Archived "${archived.title}".`,
      data: { status: "archived", piggyBank: describe(archived) },
    };
  },
});

export const depositToPiggyBank = defineTool({
  name: "deposit_to_piggy_bank",
  title: "Deposit into a piggy bank",
  description:
    "Put money into a piggy bank. fromAccount is another account (a transfer into the parent account is created, neutral in spending); omit it to take the money from the parent account's free balance. Amount in major units of the piggy bank's currency. To split one transfer across several piggy banks pass allocations instead of piggyBank and amount. Use dryRun=true to preview.",
  input: z.object({
    piggyBank: z.string().optional().describe("A piggy bank title or id."),
    amount: z.number().positive().optional(),
    allocations: z
      .array(z.object({ piggyBank: z.string(), amount: z.number().positive() }))
      .min(1)
      .max(50)
      .optional()
      .describe("Bulk split: one transfer shared by several piggy banks of the same account."),
    fromAccount: z.string().optional(),
    date: z.iso.date().optional(),
    note: z.string().max(500).optional(),
    dryRun: z.boolean().default(false),
  }),
  annotations: WRITE,
  async handler(context, args): Promise<ToolOutput> {
    const problems = new Problems();
    const fromAccountId = await accountId(context, problems, "fromAccount", args.fromAccount);
    const common = {
      ...(fromAccountId ? { fromAccountId } : {}),
      ...(args.date ? { date: args.date } : {}),
      ...(args.note ? { note: args.note } : {}),
    };
    if (args.allocations) {
      const resolved: { piggyBankId: string; amount: number; title: string }[] = [];
      for (const [index, allocation] of args.allocations.entries()) {
        const piggy = await resolvePiggyBank(
          context,
          problems,
          `allocations[${index}].piggyBank`,
          allocation.piggyBank,
        );
        if (piggy) {
          resolved.push({
            piggyBankId: piggy.id,
            title: piggy.title,
            amount: majorToMinor(allocation.amount, piggy.currencyCode),
          });
        }
      }
      if (problems.any) return clarificationOutput(problems);
      const body = {
        ...common,
        allocations: resolved.map(({ piggyBankId, amount }) => ({ piggyBankId, amount })),
      };
      if (args.dryRun) {
        return {
          summary: "Dry run: nothing was deposited.",
          data: {
            status: "dry_run",
            wouldDeposit: { ...body, titles: resolved.map((r) => r.title) },
          },
        };
      }
      const operation = await context.client.request(piggyBanksEndpoints.bulkDeposit, { body });
      context.refs.invalidate();
      return {
        summary: `Split a deposit across ${resolved.length} piggy banks.`,
        data: { status: "deposited", ...describeOperation(operation) },
      };
    }
    if (!args.piggyBank || args.amount === undefined) {
      return {
        isError: true,
        summary: "Give piggyBank and amount, or allocations for a split.",
        data: { status: "invalid_input", missing: "piggyBank and amount" },
      };
    }
    const piggy = await resolvePiggyBank(context, problems, "piggyBank", args.piggyBank);
    if (problems.any || !piggy) return clarificationOutput(problems);
    const body = { ...common, amount: majorToMinor(args.amount, piggy.currencyCode) };
    if (args.dryRun) {
      return {
        summary: "Dry run: nothing was deposited.",
        data: { status: "dry_run", piggyBank: piggy.title, wouldDeposit: body },
      };
    }
    const operation = await context.client.request(piggyBanksEndpoints.deposit, {
      params: { id: piggy.id },
      body,
    });
    context.refs.invalidate();
    return {
      summary: `Deposited ${majorToMoney(args.amount, piggy.currencyCode).formatted} into "${piggy.title}".`,
      data: { status: "deposited", ...describeOperation(operation) },
    };
  },
});

export const withdrawFromPiggyBank = defineTool({
  name: "withdraw_from_piggy_bank",
  title: "Withdraw from a piggy bank",
  description:
    "Take money out of a piggy bank. toAccount is another account (a transfer out of the parent account is created); omit it to leave the money in the parent account as free balance. Cannot take more than the piggy bank holds. Use dryRun=true to preview.",
  input: z.object({
    piggyBank: z.string(),
    amount: z.number().positive(),
    toAccount: z.string().optional(),
    date: z.iso.date().optional(),
    note: z.string().max(500).optional(),
    dryRun: z.boolean().default(false),
  }),
  annotations: WRITE,
  async handler(context, args): Promise<ToolOutput> {
    const problems = new Problems();
    const piggy = await resolvePiggyBank(context, problems, "piggyBank", args.piggyBank);
    const toAccountId = await accountId(context, problems, "toAccount", args.toAccount);
    if (problems.any || !piggy) return clarificationOutput(problems);
    const body = {
      amount: majorToMinor(args.amount, piggy.currencyCode),
      ...(toAccountId ? { toAccountId } : {}),
      ...(args.date ? { date: args.date } : {}),
      ...(args.note ? { note: args.note } : {}),
    };
    if (args.dryRun) {
      return {
        summary: "Dry run: nothing was withdrawn.",
        data: { status: "dry_run", piggyBank: piggy.title, wouldWithdraw: body },
      };
    }
    const operation = await context.client.request(piggyBanksEndpoints.withdraw, {
      params: { id: piggy.id },
      body,
    });
    context.refs.invalidate();
    return {
      summary: `Withdrew ${majorToMoney(args.amount, piggy.currencyCode).formatted} from "${piggy.title}".`,
      data: { status: "withdrawn", ...describeOperation(operation) },
    };
  },
});

export const moveBetweenPiggyBanks = defineTool({
  name: "move_between_piggy_banks",
  title: "Move money between piggy banks",
  description:
    "Move money from one piggy bank to another (same account and currency). Nothing changes in the account or in reports; only the buckets. Use dryRun=true to preview.",
  input: z.object({
    from: z.string().describe("Source piggy bank title or id."),
    to: z.string().describe("Destination piggy bank title or id."),
    amount: z.number().positive(),
    date: z.iso.date().optional(),
    note: z.string().max(500).optional(),
    dryRun: z.boolean().default(false),
  }),
  annotations: WRITE,
  async handler(context, args): Promise<ToolOutput> {
    const problems = new Problems();
    const from = await resolvePiggyBank(context, problems, "from", args.from);
    const to = await resolvePiggyBank(context, problems, "to", args.to);
    if (problems.any || !from || !to) return clarificationOutput(problems);
    if (from.id === to.id) {
      return {
        isError: true,
        summary: "Pick two different piggy banks.",
        data: { status: "invalid_input" },
      };
    }
    const body = {
      fromPiggyBankId: from.id,
      toPiggyBankId: to.id,
      amount: majorToMinor(args.amount, from.currencyCode),
      ...(args.date ? { date: args.date } : {}),
      ...(args.note ? { note: args.note } : {}),
    };
    if (args.dryRun) {
      return {
        summary: "Dry run: nothing was moved.",
        data: { status: "dry_run", wouldMove: body },
      };
    }
    const operation = await context.client.request(piggyBanksEndpoints.move, { body });
    return {
      summary: `Moved ${majorToMoney(args.amount, from.currencyCode).formatted} from "${from.title}" to "${to.title}".`,
      data: { status: "moved", ...describeOperation(operation) },
    };
  },
});

export const setPiggyBankBalance = defineTool({
  name: "set_piggy_bank_balance",
  title: "Set a piggy bank's real balance",
  description:
    "Tell Luraba what the bank really shows for a piggy bank now. The difference to the computed balance becomes an adjustment (not income or spending), estimated interest is confirmed and the next accrual starts from the real balance. Use after the bank credited interest that differs from the estimate. Use dryRun=true to preview.",
  input: z.object({
    piggyBank: z.string(),
    balance: z.number().min(0).describe("The real balance, major units."),
    date: z.iso.date().optional(),
    note: z.string().max(500).optional(),
    dryRun: z.boolean().default(false),
  }),
  annotations: WRITE,
  async handler(context, args): Promise<ToolOutput> {
    const problems = new Problems();
    const piggy = await resolvePiggyBank(context, problems, "piggyBank", args.piggyBank);
    if (problems.any || !piggy) return clarificationOutput(problems);
    const body = {
      balance: majorToMinor(args.balance, piggy.currencyCode),
      ...(args.date ? { date: args.date } : {}),
      ...(args.note ? { note: args.note } : {}),
    };
    if (args.dryRun) {
      return {
        summary: `Dry run: the adjustment would be ${toMoney(body.balance - piggy.balance, piggy.currencyCode).formatted}.`,
        data: {
          status: "dry_run",
          computedBalance: toMoney(piggy.balance, piggy.currencyCode),
          wouldSet: body,
        },
      };
    }
    const operation = await context.client.request(piggyBanksEndpoints.setBalance, {
      params: { id: piggy.id },
      body,
    });
    context.refs.invalidate();
    return {
      summary: `Set "${piggy.title}" to ${majorToMoney(args.balance, piggy.currencyCode).formatted}.`,
      data: { status: "balance_set", ...describeOperation(operation) },
    };
  },
});

export const linkGoalToPiggyBank = defineTool({
  name: "link_goal_to_piggy_bank",
  title: "Link a goal to piggy banks",
  description:
    'Make a goal\'s progress follow piggy banks: its saved amount becomes the sum of the linked balances (interest included, converted to the goal currency) and manual contributions are refused. mode "add" (default) keeps existing links, "replace" sets exactly this list, "remove" unlinks these. Use dryRun=true to preview.',
  input: z.object({
    goal: z.string().describe("A goal name or id."),
    piggyBanks: z.array(z.string()).min(1).max(50),
    mode: z.enum(["add", "replace", "remove"]).default("add"),
    dryRun: z.boolean().default(false),
  }),
  annotations: WRITE,
  async handler(context, args): Promise<ToolOutput> {
    const problems = new Problems();
    const goals = await fetchAllPages((page) =>
      context.client.request(goalsEndpoints.list, { query: { page, perPage: PAGE_SIZE } }),
    );
    const goalId = problems.take("goal", resolveByName(args.goal, goals));
    const picked: PiggyBank[] = [];
    for (const [index, query] of args.piggyBanks.entries()) {
      const piggy = await resolvePiggyBank(context, problems, `piggyBanks[${index}]`, query);
      if (piggy) picked.push(piggy);
    }
    if (problems.any || !goalId) return clarificationOutput(problems);
    const current = await context.client.request(piggyBanksEndpoints.goalLinks, {
      params: { id: goalId },
    });
    const currentIds = current.piggyBanks.map((piggy) => piggy.id);
    const pickedIds = picked.map((piggy) => piggy.id);
    const next =
      args.mode === "replace"
        ? pickedIds
        : args.mode === "remove"
          ? currentIds.filter((id) => !pickedIds.includes(id))
          : [...new Set([...currentIds, ...pickedIds])];
    if (args.dryRun) {
      return {
        summary: "Dry run: nothing was linked.",
        data: { status: "dry_run", wouldLink: next },
      };
    }
    const updated = await context.client.request(piggyBanksEndpoints.setGoalLinks, {
      params: { id: goalId },
      body: { piggyBankIds: next },
    });
    const goal = goals.find((g) => g.id === goalId);
    const currency = goal?.currencyCode ?? "USD";
    return {
      summary: `"${goal?.name}" now follows ${updated.piggyBanks.length} piggy bank(s): ${toMoney(updated.saved, currency).formatted} saved.`,
      data: {
        status: "linked",
        goal: goal?.name,
        saved: toMoney(updated.saved, currency),
        piggyBanks: updated.piggyBanks.map((piggy) => ({
          title: piggy.title,
          balance: toMoney(piggy.balance, piggy.currencyCode),
          inGoalCurrency: toMoney(piggy.balanceInGoalCurrency, currency),
        })),
      },
    };
  },
});

export const reportPiggyBanks = defineTool({
  name: "report_piggy_banks",
  title: "Piggy banks report",
  description:
    "Per piggy bank: balance, net if withdrawn today (after IR and IOF), earnings this month and all time, expected yearly rate and the projected balance in 12 months with no new deposits; plus totals per currency. Never adds different currencies together.",
  input: z.object({ month: monthSchema.optional().describe("Defaults to this month.") }),
  annotations: READ_ONLY,
  async handler(context, args): Promise<ToolOutput> {
    const report = await context.client.request(piggyBanksEndpoints.report, {
      query: args.month ? { month: args.month } : {},
    });
    return {
      summary: `${report.piggyBanks.length} piggy bank(s) for ${report.month}.`,
      data: {
        month: report.month,
        piggyBanks: report.piggyBanks.map((row) => ({
          id: row.id,
          title: row.title,
          account: row.parentAccountName,
          yield: row.yieldLabel,
          balance: toMoney(row.balance, row.currencyCode),
          netIfWithdrawn: toMoney(row.netIfWithdrawn, row.currencyCode),
          earnedThisMonth: toMoney(row.earningsMonth, row.currencyCode),
          earnedAllTime: toMoney(row.earningsAllTime, row.currencyCode),
          expectedAnnualRatePercent: Math.round(row.annualRate * 10_000) / 100,
          projectedIn12Months: toMoney(row.projectedIn12Months, row.currencyCode),
        })),
        totals: report.totals.map((total) => ({
          currency: total.currencyCode,
          balance: toMoney(total.balance, total.currencyCode),
          earnedThisMonth: toMoney(total.earningsMonth, total.currencyCode),
          earnedAllTime: toMoney(total.earningsAllTime, total.currencyCode),
        })),
      },
    };
  },
});
