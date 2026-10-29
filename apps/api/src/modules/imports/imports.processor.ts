import { importBatchesTable, importRecordsTable } from "@luraba/db/schemas/imports.schema";
import { eq } from "drizzle-orm";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";
import { accountsRepository } from "@/modules/accounts/accounts.repository";
import { categoriesRepository } from "@/modules/categories/categories.repository";
import * as creditCardsRepository from "@/modules/credit-cards/credit-cards.repository";
import { isUniqueViolation } from "@/shared/errors";
import { logger } from "@/shared/logger";
import { importerFor } from "./importers";
import { loadHouseholdContext } from "./imports.context";
import {
  duplicateMarkOf,
  type EvaluationContext,
  effectiveMapping,
  evaluateRow,
  hasBlockingIssue,
  numberedPairKey,
  withPairOccurrences,
} from "./imports.evaluate";
import { type ImportTarget, loadTarget } from "./imports.ledger";
import {
  importBatchesRepository,
  importMappingsRepository,
  importRecordsRepository,
  importRowsRepository,
} from "./imports.repository";
import type { ImportBatchRecord, ImportRowRecord } from "./imports.types";

const PROGRESS_EVERY = 20;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}

async function writeProgress(context: HouseholdContext, batchId: string) {
  const counts = await importRowsRepository.outcomeCounts(batchId);
  const processed = Object.entries(counts)
    .filter(([outcome]) => outcome !== "pending")
    .reduce((sum, [, count]) => sum + count, 0);
  await importBatchesRepository.update(batchId, context, {
    processedCount: processed,
    createdCount: counts.created ?? 0,
    duplicateCount: counts.duplicate ?? 0,
    skippedCount: counts.skipped ?? 0,
    failedCount: counts.failed ?? 0,
  });
}

async function buildContext(
  context: HouseholdContext,
  batch: ImportBatchRecord,
  target: ImportTarget,
  rows: ImportRowRecord[],
): Promise<EvaluationContext> {
  const mappings = new Map(
    (await importMappingsRepository.list(context)).map((m) => [m.sourceKey, m]),
  );
  const categoryTypes = new Map<string, "expense" | "income">();
  const accounts = new Map<string, { currencyCode: string }>();
  const cards = new Map<string, { currencyCode: string }>();
  for (const row of rows) {
    const mapping = effectiveMapping(row, mappings);
    if (mapping.categoryId && !categoryTypes.has(mapping.categoryId)) {
      const category = await categoriesRepository.get(mapping.categoryId, context);
      if (category) categoryTypes.set(mapping.categoryId, category.type);
    }
    if (mapping.accountId && !accounts.has(mapping.accountId)) {
      const account = await accountsRepository.get(mapping.accountId, context);
      if (account) accounts.set(account.id, { currencyCode: account.currencyId });
    }
    if (mapping.creditCardId && !cards.has(mapping.creditCardId)) {
      const card = await creditCardsRepository.findById(context.householdId, mapping.creditCardId);
      if (card) cards.set(card.id, { currencyCode: card.currencyCode });
    }
  }
  return withPairOccurrences(rows, {
    sourceKind: batch.sourceKind as EvaluationContext["sourceKind"],
    target: { id: target.id, currencyCode: target.currencyCode },
    statementCurrency: batch.currencyCode,
    mappings,
    categoryTypes,
    accounts,
    cards,
    existingPairKeys: new Set(),
    pairOccurrence: new Map(),
  });
}

/**
 * Runs a staged batch: creates the Luraba records row by row and records each outcome. Safe to run
 * twice (a retry, or "import again" after fixing failures): rows with an outcome of created or
 * duplicate are left alone, and every created row writes an `import_records` entry that a later
 * run, or a later file, matches before creating anything.
 */
export async function processImportBatch(batchId: string): Promise<void> {
  const [found] = await db
    .select()
    .from(importBatchesTable)
    .where(eq(importBatchesTable.id, batchId));
  if (!found) return;
  const context = await loadHouseholdContext(found.householdId, found.createdByUserId);
  const batch = context ? await importBatchesRepository.get(batchId, context) : undefined;
  if (!context || !batch) {
    await db
      .update(importBatchesTable)
      .set({
        status: "failed",
        errorMessage: "The user who started this import no longer has access",
        finishedAt: new Date(),
      })
      .where(eq(importBatchesTable.id, batchId));
    return;
  }

  try {
    await importBatchesRepository.update(batchId, context, {
      status: "importing",
      errorMessage: null,
    });
    const target = await loadTarget(context, batch);
    if (!target) throw new Error("The chosen account or card no longer exists");

    const rows = await importRowsRepository.listAll(batchId);
    const evaluation = await buildContext(context, batch, target, rows);
    const targetType = target.type;

    const todo = rows
      .filter((row) => row.outcome !== "created" && row.outcome !== "duplicate")
      .map((row) => ({ row, result: evaluateRow(row, evaluation) }))
      // Purchases before payments: a payment cannot exceed the credit in use.
      .sort(
        (a, b) =>
          Number(a.result.kind === "card_payment") - Number(b.result.kind === "card_payment") ||
          (a.row.postedDate?.getTime() ?? 0) - (b.row.postedDate?.getTime() ?? 0) ||
          a.row.rowIndex - b.row.rowIndex,
      );

    let sinceProgress = 0;
    for (const { row, result } of todo) {
      const mark = duplicateMarkOf(row);
      try {
        if (row.skip) {
          if (mark?.level === "exact")
            await importRowsRepository.setOutcome(row.id, "duplicate", mark.message);
          else
            await importRowsRepository.setOutcome(
              row.id,
              "skipped",
              mark?.message ?? "Skipped by you",
            );
          continue;
        }
        if (
          hasBlockingIssue(result.issues) ||
          !result.kind ||
          row.amount === null ||
          !row.postedDate
        ) {
          const first = result.issues.find((issue) => issue.severity === "error");
          await importRowsRepository.setOutcome(
            row.id,
            "failed",
            first?.message ?? "The row is invalid",
          );
          continue;
        }

        const mapping = effectiveMapping(row, evaluation.mappings);
        const pairKey = numberedPairKey(row, result.kind, mapping, evaluation);
        const existing = await importRecordsRepository.findMatch(context, targetType, target.id, {
          externalId: row.externalId,
          fingerprint: row.fingerprint,
          seriesKey: row.seriesKey,
          pairKey,
        });
        if (existing) {
          await importRowsRepository.setOutcome(
            row.id,
            "duplicate",
            existing.pairKey && existing.pairKey === pairKey
              ? "The same movement was already imported from another statement."
              : "Already imported.",
          );
          continue;
        }

        const importer = importerFor(result.kind);
        if (!importer) {
          await importRowsRepository.setOutcome(
            row.id,
            "failed",
            `No importer for "${result.kind}" rows`,
          );
          continue;
        }
        const created = await importer.importRow({
          context,
          batch,
          target,
          row,
          kind: result.kind,
          mapping,
          amount: Math.abs(row.amount),
          date: row.postedDate.toISOString().slice(0, 10),
          description: row.descriptionOverride ?? row.description,
        });
        if (created.status === "duplicate") {
          await importRowsRepository.setOutcome(row.id, "duplicate", created.message);
          continue;
        }
        await db.insert(importRecordsTable).values({
          householdId: context.householdId,
          batchId,
          targetType,
          targetId: target.id,
          externalId: row.externalId,
          fingerprint: row.fingerprint,
          seriesKey: row.seriesKey,
          pairKey,
          transactionId: created.transactionId,
        });
        await importRowsRepository.setOutcome(row.id, "created", null, created.transactionId);
      } catch (error) {
        if (isUniqueViolation(error)) {
          await importRowsRepository.setOutcome(row.id, "duplicate", "Already imported.");
        } else {
          await importRowsRepository.setOutcome(row.id, "failed", errorMessage(error));
        }
      }
      sinceProgress += 1;
      if (sinceProgress >= PROGRESS_EVERY) {
        sinceProgress = 0;
        await writeProgress(context, batchId);
      }
    }

    await writeProgress(context, batchId);
    await importBatchesRepository.update(batchId, context, {
      status: "completed",
      finishedAt: new Date(),
    });
  } catch (error) {
    logger.error({ err: error, batchId }, "[imports] Import failed");
    await importBatchesRepository.update(batchId, context, {
      status: "failed",
      errorMessage: errorMessage(error),
      finishedAt: new Date(),
    });
  }
}
