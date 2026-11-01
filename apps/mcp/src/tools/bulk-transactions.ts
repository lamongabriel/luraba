import {
  type TransactionFeedRow,
  transactionsEndpoints,
  type UpdateTransactionInput,
} from "@luraba/contracts";
import { z } from "zod";
import { loadNameMaps, summarizeRow } from "../format/transactions.js";
import { clarificationOutput, Problems } from "../resolve/problems.js";
import {
  buildTransactionQuery,
  loadMatching,
  transactionFilterSchema,
} from "./transaction-filters.js";
import { resolveClassification } from "./transactions.js";
import { DESTRUCTIVE, defineTool, type ToolContext, type ToolOutput, WRITE } from "./types.js";

/** One call changes at most this many transactions (the API allows 600 requests a minute per key). */
export const BULK_LIMIT = 300;
const CONCURRENCY = 4;
const SAMPLE = 20;

const selectionSchema = z
  .object({
    ids: z.array(z.uuid()).min(1).max(BULK_LIMIT).optional().describe("Transaction ids."),
    filter: transactionFilterSchema
      .optional()
      .describe("Same filters as search_transactions; every match is selected."),
  })
  .describe("Exactly one of ids or filter.");

type Selection = z.output<typeof selectionSchema>;

type Resolved = { rows: TransactionFeedRow[] } | { output: ToolOutput };

async function selectRows(context: ToolContext, selection: Selection): Promise<Resolved> {
  if (!selection.ids === !selection.filter) {
    return {
      output: {
        isError: true,
        summary: "Pass exactly one of selection.ids or selection.filter.",
        data: { status: "invalid_input" },
      },
    };
  }
  let rows: TransactionFeedRow[];
  if (selection.ids) {
    rows = [];
    const ids = [...new Set(selection.ids)];
    for (let i = 0; i < ids.length; i += CONCURRENCY) {
      const batch = await Promise.all(
        ids
          .slice(i, i + CONCURRENCY)
          .map((id) => context.client.request(transactionsEndpoints.get, { params: { id } })),
      );
      rows.push(...(batch as unknown as TransactionFeedRow[]));
    }
  } else {
    const { query, problems } = await buildTransactionQuery(context, selection.filter ?? {});
    if (problems.any) return { output: clarificationOutput(problems) };
    const found = await loadMatching(context, query, BULK_LIMIT);
    if (found.truncated) {
      return {
        output: {
          isError: true,
          summary: `The filter matches ${found.totalCount} transactions; the limit per call is ${BULK_LIMIT}. Narrow the filter (for example by date) and repeat.`,
          data: { status: "too_many_matches", totalCount: found.totalCount, limit: BULK_LIMIT },
        },
      };
    }
    rows = found.rows;
  }
  // Credit card installments of one purchase share a transaction id.
  const unique = new Map<string, TransactionFeedRow>();
  for (const row of rows) if (!unique.has(row.id)) unique.set(row.id, row);
  return { rows: [...unique.values()] };
}

async function runPool<T, R>(items: T[], work: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await work(items[index] as T);
      }
    }),
  );
  return results;
}

const mutationControls = {
  createMissing: z.boolean().default(false),
  dryRun: z
    .boolean()
    .default(false)
    .describe("Preview what would change without changing anything."),
  confirm: z
    .boolean()
    .default(false)
    .describe("Must be true to apply. Without it you get the preview only."),
};

type Plan = {
  row: TransactionFeedRow;
  body: UpdateTransactionInput;
  before: string[];
  after: string[];
};

async function applyPlans(
  context: ToolContext,
  plans: Plan[],
  unchanged: number,
  controls: { dryRun: boolean; confirm: boolean },
  alsoCreated: { kind: string; name: string }[],
): Promise<ToolOutput> {
  const names = await loadNameMaps(context.refs);
  const sample = plans.slice(0, SAMPLE).map((plan) => ({
    id: plan.row.id,
    description: plan.row.description,
    transaction: summarizeRow(plan.row, names),
    update: plan.body,
  }));
  if (controls.dryRun || !controls.confirm) {
    return {
      summary: controls.dryRun
        ? `Dry run: ${plans.length} transaction(s) would change, ${unchanged} already match.`
        : `Not applied: confirm=true is required. ${plans.length} transaction(s) would change.`,
      data: {
        status: controls.dryRun ? "dry_run" : "confirmation_required",
        wouldChange: plans.length,
        alreadyMatching: unchanged,
        wouldAlsoCreate: alsoCreated,
        sample,
        sampleNote: plans.length > SAMPLE ? `First ${SAMPLE} of ${plans.length} shown.` : undefined,
      },
    };
  }
  const outcomes = await runPool(plans, async (plan) => {
    try {
      await context.client.request(transactionsEndpoints.update, {
        params: { id: plan.row.id },
        body: plan.body,
      });
      return { id: plan.row.id, ok: true as const };
    } catch (error) {
      return {
        id: plan.row.id,
        ok: false as const,
        error: error instanceof Error ? error.message : "failed",
      };
    }
  });
  const failed = outcomes.filter((outcome) => !outcome.ok);
  return {
    isError: failed.length === plans.length && plans.length > 0,
    summary: `Updated ${outcomes.length - failed.length} of ${plans.length} transaction(s); ${unchanged} already matched.`,
    data: {
      status: failed.length === 0 ? "updated" : "partially_updated",
      updated: outcomes.length - failed.length,
      failed: failed.length,
      alreadyMatching: unchanged,
      alsoCreated,
      failures: failed.slice(0, 20),
      sample,
    },
  };
}

async function planUpdates(
  context: ToolContext,
  rows: TransactionFeedRow[],
  set: {
    category?: string | undefined;
    merchant?: string | undefined;
    addTags?: string[] | undefined;
    removeTags?: string[] | undefined;
    clearCategory?: boolean | undefined;
    includeInBudget?: boolean | undefined;
    createMissing: boolean;
  },
  dryRun: boolean,
): Promise<
  | { plans: Plan[]; unchanged: number; created: { kind: string; name: string }[] }
  | { output: ToolOutput }
> {
  const problems = new Problems();
  const classification = await resolveClassification(
    context,
    problems,
    {
      category: set.category,
      merchant: set.merchant,
      tags: set.addTags,
      createMissing: set.createMissing,
    },
    { dryRun },
  );
  const removeIds = new Set<string>();
  for (const name of set.removeTags ?? []) {
    const id = problems.take("removeTags", await context.refs.resolveTag(name));
    if (id) removeIds.add(id);
  }
  if (problems.any) return { output: clarificationOutput(problems) };

  const plans: Plan[] = [];
  let unchanged = 0;
  for (const row of rows) {
    const body: UpdateTransactionInput = {};
    if (set.clearCategory && row.categoryId) body.categoryId = null;
    if (classification.categoryId && row.categoryId !== classification.categoryId)
      body.categoryId = classification.categoryId;
    if (classification.merchantId && row.merchantId !== classification.merchantId)
      body.merchantId = classification.merchantId;
    if (set.includeInBudget !== undefined && row.includeInBudget !== set.includeInBudget)
      body.includeInBudget = set.includeInBudget;
    if (classification.tagIds || removeIds.size > 0) {
      const current = row.tags.map((tag) => tag.id);
      const next = [...new Set([...current, ...(classification.tagIds ?? [])])].filter(
        (id) => !removeIds.has(id),
      );
      if (next.length !== current.length || next.some((id) => !current.includes(id)))
        body.tagIds = next;
    }
    if (Object.keys(body).length === 0) unchanged += 1;
    else plans.push({ row, body, before: [], after: [] });
  }
  return { plans, unchanged, created: classification.created };
}

async function bulkUpdate(
  context: ToolContext,
  selection: Selection,
  set: Parameters<typeof planUpdates>[2],
  controls: { dryRun: boolean; confirm: boolean },
): Promise<ToolOutput> {
  const selected = await selectRows(context, selection);
  if ("output" in selected) return selected.output;
  if (selected.rows.length === 0)
    return { summary: "No transactions matched.", data: { status: "no_matches" } };
  const planned = await planUpdates(
    context,
    selected.rows,
    set,
    controls.dryRun || !controls.confirm,
  );
  if ("output" in planned) return planned.output;
  return applyPlans(context, planned.plans, planned.unchanged, controls, planned.created);
}

export const bulkUpdateTransactions = defineTool({
  name: "bulk_update_transactions",
  title: "Bulk update transactions",
  description: `Change category, merchant, tags (add/remove) or includeInBudget on many transactions at once, chosen by ids or by the same filter as search_transactions (at most ${BULK_LIMIT} per call). Use dryRun=true to preview; applying requires confirm=true, otherwise only the preview is returned. Each result reports updated, failed and already-matching counts.`,
  input: z.object({
    selection: selectionSchema,
    set: z.object({
      category: z.string().optional(),
      clearCategory: z.boolean().optional(),
      merchant: z.string().optional(),
      addTags: z.array(z.string().min(1)).max(50).optional(),
      removeTags: z.array(z.string().min(1)).max(50).optional(),
      includeInBudget: z.boolean().optional(),
    }),
    ...mutationControls,
  }),
  annotations: WRITE,
  handler: (context, { selection, set, createMissing, dryRun, confirm }) =>
    bulkUpdate(context, selection, { ...set, createMissing }, { dryRun, confirm }),
});

export const bulkCategorizeTransactions = defineTool({
  name: "bulk_categorize_transactions",
  title: "Bulk categorize transactions",
  description: `Set the category (and optionally merchant and tags) on many transactions, chosen by ids or by filter (for example uncategorized ones whose description contains "uber"). At most ${BULK_LIMIT} per call. Use dryRun=true to preview the count and a sample; applying requires confirm=true.`,
  input: z.object({
    selection: selectionSchema,
    category: z.string().min(1).describe("Category name or id."),
    merchant: z.string().optional(),
    addTags: z.array(z.string().min(1)).max(50).optional(),
    ...mutationControls,
  }),
  annotations: WRITE,
  handler: (context, { selection, category, merchant, addTags, createMissing, dryRun, confirm }) =>
    bulkUpdate(
      context,
      selection,
      { category, merchant, addTags, createMissing },
      { dryRun, confirm },
    ),
});

export const bulkDeleteTransactions = defineTool({
  name: "bulk_delete_transactions",
  title: "Bulk delete transactions",
  description: `Permanently delete many transactions chosen by ids or filter (at most ${BULK_LIMIT} per call). Requires confirm=true; without it, or with dryRun=true, only the list of what would be deleted is returned. Always show that list to the user first.`,
  input: z.object({
    selection: selectionSchema,
    dryRun: z.boolean().default(false),
    confirm: z.boolean().default(false),
  }),
  annotations: DESTRUCTIVE,
  async handler(context, { selection, dryRun, confirm }) {
    const selected = await selectRows(context, selection);
    if ("output" in selected) return selected.output;
    const names = await loadNameMaps(context.refs);
    const sample = selected.rows.slice(0, SAMPLE).map((row) => summarizeRow(row, names));
    if (selected.rows.length === 0)
      return { summary: "No transactions matched.", data: { status: "no_matches" } };
    if (dryRun || !confirm) {
      return {
        summary: dryRun
          ? `Dry run: ${selected.rows.length} transaction(s) would be deleted.`
          : `Not deleted: confirm=true is required. ${selected.rows.length} transaction(s) would be deleted.`,
        data: {
          status: dryRun ? "dry_run" : "confirmation_required",
          wouldDelete: selected.rows.length,
          sample,
        },
      };
    }
    const outcomes = await runPool(selected.rows, async (row) => {
      try {
        await context.client.request(transactionsEndpoints.delete, { params: { id: row.id } });
        return { id: row.id, ok: true as const };
      } catch (error) {
        return {
          id: row.id,
          ok: false as const,
          error: error instanceof Error ? error.message : "failed",
        };
      }
    });
    const failed = outcomes.filter((outcome) => !outcome.ok);
    return {
      isError: failed.length === outcomes.length,
      summary: `Deleted ${outcomes.length - failed.length} of ${outcomes.length} transaction(s).`,
      data: {
        status: failed.length === 0 ? "deleted" : "partially_deleted",
        deleted: outcomes.length - failed.length,
        failed: failed.length,
        failures: failed.slice(0, 20),
        sample,
      },
    };
  },
});
