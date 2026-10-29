import { createHash } from "node:crypto";
import type {
  ImportBatch,
  ImportGroup,
  ImportParser,
  ImportReconciliation,
  ImportRow,
  ImportRowStatus,
  listImportRowsQuerySchema,
  SaveImportMappingInput,
  StartImportInput,
  UpdateImportInput,
  UpdateImportRowsInput,
} from "@luraba/contracts/imports";
import { importRowsTable } from "@luraba/db/schemas/imports.schema";
import { formatISODateTime } from "@luraba/domain";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { z } from "zod";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";
import { accountsRepository } from "@/modules/accounts/accounts.repository";
import { categoriesRepository } from "@/modules/categories/categories.repository";
import * as creditCardsRepository from "@/modules/credit-cards/credit-cards.repository";
import { merchantsRepository } from "@/modules/merchants/merchants.repository";
import { validateTagIds } from "@/modules/tags/tags-associations.service";
import { NotFoundError, ValidationError } from "@/shared/errors";
import { createListMeta, type ListResult } from "@/shared/list";
import { detectDefaults } from "./imports.duplicates";
import {
  type EvaluationContext,
  effectiveMapping,
  evaluateRow,
  groupMapping,
  hasBlockingIssue,
  hintLabel,
  isUnmapped,
  withPairOccurrences,
} from "./imports.evaluate";
import { loadTarget } from "./imports.ledger";
import { normalizeRows } from "./imports.normalize";
import { batchSummarySelect, buildRowFilter } from "./imports.query";
import { enqueueImportBatch } from "./imports.queue";
import {
  importBatchesRepository,
  importMappingsRepository,
  importRecordsRepository,
  importRowsRepository,
} from "./imports.repository";
import type { ImportBatchRecord, ImportMappingRecord, ImportRowRecord } from "./imports.types";
import { detectParser, getParser, parserAdapters } from "./parsers/registry";
import { decodeFileBytes } from "./parsers/text";

const MAX_ROWS = 20_000;

function isoDate(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

// ---------------------------------------------------------------------------
// Wire mapping
// ---------------------------------------------------------------------------

export function deriveRowStatus(row: ImportRowRecord): ImportRowStatus {
  if (row.outcome === "created") return "created";
  if (row.outcome === "duplicate") return "duplicate";
  if (row.outcome === "failed") return "failed";
  if (row.outcome === "skipped") return "skipped";
  if (row.issues.some((issue) => issue.code === "duplicate")) return "duplicate";
  if (row.skip) return "skipped";
  return hasBlockingIssue(row.issues) ? "invalid" : "ready";
}

function toRowResponse(
  row: ImportRowRecord,
  mappings: ReadonlyMap<string, ImportMappingRecord>,
): ImportRow {
  return {
    id: row.id,
    rowIndex: row.rowIndex,
    postedDate: isoDate(row.postedDate),
    amount: row.amount,
    description: row.description,
    counterparty: row.counterparty,
    sourceKey: row.sourceKey,
    externalId: row.externalId,
    installmentNumber: row.installmentNumber,
    installmentTotal: row.installmentTotal,
    balanceAfter: row.balanceAfter,
    merchantId: row.merchantId,
    categoryId: row.categoryId,
    tagIds: row.tagIds,
    descriptionOverride: row.descriptionOverride,
    skip: row.skip,
    effective: effectiveMapping(row, mappings),
    kind: (row.kind as ImportRow["kind"]) ?? null,
    status: deriveRowStatus(row),
    issues: row.issues,
    outcome: row.outcome as ImportRow["outcome"],
    outcomeMessage: row.outcomeMessage,
  };
}

async function loadSummaries(batchIds: string[]) {
  if (batchIds.length === 0) return new Map<string, ImportBatch["summary"]>();
  const rows = await db
    .select({ batchId: importRowsTable.batchId, ...batchSummarySelect })
    .from(importRowsTable)
    .where(inArray(importRowsTable.batchId, batchIds))
    .groupBy(importRowsTable.batchId);
  return new Map(
    rows.map(({ batchId, ...summary }) => [batchId, summary as ImportBatch["summary"]]),
  );
}

async function toBatchResponses(
  context: HouseholdContext,
  batches: ImportBatchRecord[],
): Promise<ImportBatch[]> {
  const summaries = await loadSummaries(batches.map((b) => b.id));
  return Promise.all(
    batches.map(async (batch) => {
      let suggestedTarget: ImportBatch["suggestedTarget"] = null;
      if (batch.status === "draft" && batch.sourceAccountRef) {
        const last = await importBatchesRepository.findLastTarget(
          context,
          batch.parserId,
          batch.sourceAccountRef,
          batch.id,
        );
        if (last?.cardId && batch.sourceKind === "credit_card")
          suggestedTarget = { type: "credit_card", id: last.cardId };
        else if (last?.accountId && batch.sourceKind === "bank_account")
          suggestedTarget = { type: "account", id: last.accountId };
      }
      return {
        id: batch.id,
        status: batch.status as ImportBatch["status"],
        parserId: batch.parserId,
        parserLabel: getParser(batch.parserId)?.label ?? batch.parserId,
        sourceKind: batch.sourceKind as ImportBatch["sourceKind"],
        fileName: batch.fileName,
        fileSize: batch.fileSize,
        institution: batch.institution,
        sourceAccountRef: batch.sourceAccountRef,
        currencyCode: batch.currencyCode,
        periodStart: isoDate(batch.periodStart),
        periodEnd: isoDate(batch.periodEnd),
        statementBalance: batch.statementBalance,
        statementBalanceDate: isoDate(batch.statementBalanceDate),
        warnings: batch.warnings,
        targetAccountId: batch.targetAccountId,
        targetCreditCardId: batch.targetCreditCardId,
        suggestedTarget,
        rowCount: batch.rowCount,
        processedCount: batch.processedCount,
        createdCount: batch.createdCount,
        duplicateCount: batch.duplicateCount,
        skippedCount: batch.skippedCount,
        failedCount: batch.failedCount,
        errorMessage: batch.errorMessage,
        summary: summaries.get(batch.id) ?? {
          ready: 0,
          invalid: 0,
          duplicates: 0,
          skipped: 0,
          warnings: 0,
        },
        startedAt: batch.startedAt ? formatISODateTime(batch.startedAt) : null,
        finishedAt: batch.finishedAt ? formatISODateTime(batch.finishedAt) : null,
        createdAt: formatISODateTime(batch.createdAt),
      };
    }),
  );
}

async function toBatchResponse(context: HouseholdContext, batch: ImportBatchRecord) {
  const [response] = await toBatchResponses(context, [batch]);
  return response as ImportBatch;
}

export async function requireBatch(context: HouseholdContext, id: string) {
  const batch = await importBatchesRepository.get(id, context);
  if (!batch) throw new NotFoundError("Import");
  return batch;
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

export function listParsers(): ImportParser[] {
  return parserAdapters.map((adapter) => ({
    id: adapter.id,
    label: adapter.label,
    description: adapter.description,
    sourceKind: adapter.sourceKind,
    extensions: adapter.extensions,
  }));
}

export async function createImport(
  context: HouseholdContext,
  input: { fileName: string; bytes: Uint8Array; parserId?: string },
): Promise<ImportBatch> {
  const text = decodeFileBytes(input.bytes);
  const file = { name: input.fileName, text };
  const adapter = input.parserId ? getParser(input.parserId) : detectParser(file);
  if (input.parserId && !adapter)
    throw new ValidationError(`Unknown file format "${input.parserId}"`);
  if (!adapter) {
    throw new ValidationError(
      "This file format is not recognized. Supported: OFX, Nubank checking CSV, Nubank card CSV and Banco Inter checking CSV.",
    );
  }

  let statement: ReturnType<typeof adapter.parse>;
  try {
    statement = adapter.parse(file);
  } catch {
    throw new ValidationError(`The file could not be read as "${adapter.label}"`);
  }
  if (statement.rows.length === 0) throw new ValidationError("The file has no transactions");
  if (statement.rows.length > MAX_ROWS)
    throw new ValidationError(`The file has more than ${MAX_ROWS} rows; split it by period`);

  const normalized = normalizeRows(statement.rows);
  const batch = await importBatchesRepository.create(context, {
    householdId: context.householdId,
    createdByUserId: context.userId,
    parserId: adapter.id,
    sourceKind: statement.sourceKind,
    fileName: input.fileName.slice(0, 255),
    fileHash: createHash("sha256").update(input.bytes).digest("hex"),
    fileSize: input.bytes.byteLength,
    institution: statement.institution,
    sourceAccountRef: statement.accountRef,
    currencyCode: statement.currency,
    periodStart: statement.periodStart ? new Date(`${statement.periodStart}T00:00:00Z`) : null,
    periodEnd: statement.periodEnd ? new Date(`${statement.periodEnd}T00:00:00Z`) : null,
    statementBalance: statement.balance?.amount ?? null,
    statementBalanceDate: statement.balance?.date
      ? new Date(`${statement.balance.date}T00:00:00Z`)
      : null,
    warnings: statement.warnings,
    rowCount: normalized.length,
  });

  await importRowsRepository.insertMany(
    normalized.map((row) => ({
      batchId: batch.id,
      rowIndex: row.rowIndex,
      postedDate: row.date ? new Date(`${row.date}T00:00:00Z`) : null,
      amount: row.amount,
      description: row.description,
      counterparty: row.counterparty ?? null,
      sourceKey: row.sourceKey,
      externalId: row.externalKey,
      fingerprint: row.fingerprint,
      seriesKey: row.seriesKey,
      installmentNumber: row.installment?.number ?? null,
      installmentTotal: row.installment?.total ?? null,
      balanceAfter: row.balanceAfter ?? null,
      hints: { ...row.hints, ...(row.problems.length ? { problems: row.problems } : {}) },
      raw: row.raw,
    })),
  );

  await reevaluate(context, batch);
  return toBatchResponse(context, batch);
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

async function buildEvaluationContext(
  context: HouseholdContext,
  batch: ImportBatchRecord,
  rows: ImportRowRecord[],
): Promise<EvaluationContext> {
  const target = await loadTarget(context, batch);
  const mappings = new Map<string, ImportMappingRecord>();
  for (const mapping of await importMappingsRepository.list(context))
    mappings.set(mapping.sourceKey, mapping);

  const categoryIds = new Set<string>();
  const accountIds = new Set<string>();
  const cardIds = new Set<string>();
  for (const row of rows) {
    const effective = effectiveMapping(row, mappings);
    if (effective.categoryId) categoryIds.add(effective.categoryId);
    if (effective.accountId) accountIds.add(effective.accountId);
    if (effective.creditCardId) cardIds.add(effective.creditCardId);
  }
  const categoryTypes = new Map<string, "expense" | "income">();
  for (const id of categoryIds) {
    const category = await categoriesRepository.get(id, context);
    if (category) categoryTypes.set(id, category.type);
  }
  const accounts = new Map<string, { currencyCode: string }>();
  for (const id of accountIds) {
    const account = await accountsRepository.get(id, context);
    if (account) accounts.set(id, { currencyCode: account.currencyId });
  }
  const cards = new Map<string, { currencyCode: string }>();
  for (const id of cardIds) {
    const card = await creditCardsRepository.findById(context.householdId, id);
    if (card) cards.set(id, { currencyCode: card.currencyCode });
  }

  return withPairOccurrences(rows, {
    sourceKind: batch.sourceKind as EvaluationContext["sourceKind"],
    target: target ? { id: target.id, currencyCode: target.currencyCode } : null,
    statementCurrency: batch.currencyCode,
    mappings,
    categoryTypes,
    accounts,
    cards,
    existingPairKeys: await importRecordsRepository.listPairKeys(context),
    pairOccurrence: new Map(),
  });
}

/** Recomputes kind and issues of every row; writes only what changed. */
export async function reevaluate(context: HouseholdContext, batch: ImportBatchRecord) {
  const rows = await importRowsRepository.listAll(batch.id);
  const evaluationContext = await buildEvaluationContext(context, batch, rows);
  const updates = [];
  for (const row of rows) {
    if (row.outcome === "created" || row.outcome === "duplicate") continue;
    const result = evaluateRow(row, evaluationContext);
    if (result.kind !== row.kind || JSON.stringify(result.issues) !== JSON.stringify(row.issues))
      updates.push({ id: row.id, kind: result.kind, issues: result.issues });
  }
  await importRowsRepository.saveEvaluations(batch.id, updates);
}

/** Target changed: look for duplicates again and seed the skip flags, then re-evaluate. */
async function redetect(context: HouseholdContext, batch: ImportBatchRecord) {
  const target = await loadTarget(context, batch);
  if (target) {
    const rows = await importRowsRepository.listAll(batch.id);
    const editable = rows.filter((r) => r.outcome !== "created" && r.outcome !== "duplicate");
    const defaults = await detectDefaults(context, target, editable);
    const byId = new Map(editable.map((r) => [r.id, r]));
    await importRowsRepository.saveEvaluations(
      batch.id,
      defaults.map((d) => ({
        id: d.id,
        kind: byId.get(d.id)?.kind ?? null,
        issues: byId.get(d.id)?.issues ?? [],
        hints: d.hints,
        skip: d.skip,
      })),
    );
  }
  await reevaluate(context, batch);
}

// ---------------------------------------------------------------------------
// Batch reads and edits
// ---------------------------------------------------------------------------

export async function listImports(
  context: HouseholdContext,
  query: { page?: number; perPage?: number },
): Promise<ListResult<ImportBatch>> {
  const page = query.page ?? 1;
  const perPage = query.perPage ?? 20;
  const { rows, total } = await importBatchesRepository.listPage(context, page, perPage);
  return {
    data: await toBatchResponses(context, rows),
    meta: createListMeta({ page, perPage }, total),
  };
}

export async function getImport(context: HouseholdContext, id: string): Promise<ImportBatch> {
  return toBatchResponse(context, await requireBatch(context, id));
}

export async function updateImport(
  context: HouseholdContext,
  id: string,
  input: UpdateImportInput,
): Promise<ImportBatch> {
  const batch = await requireBatch(context, id);
  if (batch.status !== "draft") throw new ValidationError("This import has already been started");

  const values: { targetAccountId?: string | null; targetCreditCardId?: string | null } = {};
  if (batch.sourceKind === "credit_card") {
    if (input.targetAccountId) throw new ValidationError("This file is a credit card statement");
    if (input.targetCreditCardId !== undefined) {
      if (input.targetCreditCardId) {
        const card = await creditCardsRepository.findById(
          context.householdId,
          input.targetCreditCardId,
        );
        if (!card) throw new NotFoundError("Credit card");
      }
      values.targetCreditCardId = input.targetCreditCardId;
    }
  } else {
    if (input.targetCreditCardId)
      throw new ValidationError("This file is a bank account statement");
    if (input.targetAccountId !== undefined) {
      if (input.targetAccountId) {
        const account = await accountsRepository.get(input.targetAccountId, context);
        if (!account) throw new NotFoundError("Account");
        if (account.type === "credit_card")
          throw new ValidationError("Pick a bank, cash or investment account, not a credit card");
      }
      values.targetAccountId = input.targetAccountId;
    }
  }
  const updated = await importBatchesRepository.update(id, context, values);
  if (!updated) throw new NotFoundError("Import");
  await redetect(context, updated);
  return toBatchResponse(context, updated);
}

export async function deleteImport(context: HouseholdContext, id: string): Promise<void> {
  const batch = await requireBatch(context, id);
  if (batch.status === "queued" || batch.status === "importing")
    throw new ValidationError("This import is running; wait for it to finish");
  await importBatchesRepository.delete(id, context);
}

export async function listRows(
  context: HouseholdContext,
  id: string,
  query: z.output<typeof listImportRowsQuerySchema>,
): Promise<ListResult<ImportRow>> {
  await requireBatch(context, id);
  const page = query.page ?? 1;
  const perPage = query.perPage ?? 50;
  const where = buildRowFilter(id, query.filter, query.search);
  const sortColumns = {
    rowIndex: importRowsTable.rowIndex,
    postedDate: importRowsTable.postedDate,
    amount: importRowsTable.amount,
    description: importRowsTable.description,
  } as const;
  const sortColumn =
    sortColumns[(query.sort as keyof typeof sortColumns) ?? "rowIndex"] ?? importRowsTable.rowIndex;
  const order = query.sortDirection === "desc" ? desc(sortColumn) : asc(sortColumn);

  const [rows, [count]] = await Promise.all([
    db
      .select()
      .from(importRowsTable)
      .where(where)
      .orderBy(order, asc(importRowsTable.rowIndex))
      .limit(perPage)
      .offset((page - 1) * perPage),
    db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(importRowsTable)
      .where(where),
  ]);
  const mappings = new Map(
    (await importMappingsRepository.list(context)).map((m) => [m.sourceKey, m]),
  );
  return {
    data: rows.map((row) => toRowResponse(row, mappings)),
    meta: createListMeta({ page, perPage }, count?.total ?? 0),
  };
}

export async function updateRows(
  context: HouseholdContext,
  id: string,
  input: UpdateImportRowsInput,
): Promise<ImportBatch> {
  const batch = await requireBatch(context, id);
  if (batch.status === "queued" || batch.status === "importing")
    throw new ValidationError("This import is running; wait for it to finish");
  const { rowIds, ...changes } = input;

  if (changes.merchantId) {
    if (!(await merchantsRepository.get(changes.merchantId, context)))
      throw new NotFoundError("Merchant");
  }
  if (changes.categoryId) {
    if (!(await categoriesRepository.get(changes.categoryId, context)))
      throw new NotFoundError("Category");
  }
  const tagIds = changes.tagIds ? await validateTagIds(context, changes.tagIds) : changes.tagIds;

  const values: Partial<typeof importRowsTable.$inferInsert> = {};
  if (changes.skip !== undefined) values.skip = changes.skip;
  if (changes.merchantId !== undefined) values.merchantId = changes.merchantId;
  if (changes.categoryId !== undefined) values.categoryId = changes.categoryId;
  if (tagIds !== undefined) values.tagIds = tagIds as string[] | null;
  if (changes.descriptionOverride !== undefined)
    values.descriptionOverride = changes.descriptionOverride;
  await importRowsRepository.updateMany(batch.id, rowIds, values);
  await reevaluate(context, batch);
  return toBatchResponse(context, batch);
}

export async function listGroups(
  context: HouseholdContext,
  id: string,
  filter: "all" | "unmapped",
): Promise<ImportGroup[]> {
  await requireBatch(context, id);
  const rows = await importRowsRepository.listAll(id);
  const mappings = new Map(
    (await importMappingsRepository.list(context)).map((m) => [m.sourceKey, m]),
  );
  const groups = new Map<string, ImportGroup & { needsDecision: boolean }>();
  for (const row of rows) {
    const existing = groups.get(row.sourceKey);
    const group = existing ?? {
      sourceKey: row.sourceKey,
      displayName: row.counterparty || row.description,
      sampleDescription: row.description,
      rowCount: 0,
      totalAmount: 0,
      hint: hintLabel(row),
      mapping: groupMapping(mappings.get(row.sourceKey)),
      issueCount: 0,
      needsDecision: false,
    };
    group.rowCount += 1;
    group.totalAmount += row.amount ?? 0;
    group.hint ??= hintLabel(row);
    if (!row.skip && hasBlockingIssue(row.issues)) group.issueCount += 1;
    if (!row.skip && isUnmapped(row.issues)) group.needsDecision = true;
    groups.set(row.sourceKey, group);
  }
  return [...groups.values()]
    .filter((group) => filter === "all" || group.needsDecision)
    .sort((a, b) => b.rowCount - a.rowCount || a.displayName.localeCompare(b.displayName))
    .map(({ needsDecision: _needsDecision, ...group }) => group);
}

export async function saveMapping(
  context: HouseholdContext,
  id: string,
  input: SaveImportMappingInput,
): Promise<ImportBatch> {
  const batch = await requireBatch(context, id);
  if (batch.status === "queued" || batch.status === "importing")
    throw new ValidationError("This import is running; wait for it to finish");

  const sample = (
    await db
      .select({
        counterparty: importRowsTable.counterparty,
        description: importRowsTable.description,
      })
      .from(importRowsTable)
      .where(and(eq(importRowsTable.batchId, id), eq(importRowsTable.sourceKey, input.sourceKey)))
      .limit(1)
  )[0];
  if (!sample) throw new NotFoundError("Import group");

  const merchantId = input.targetType === "merchant" ? (input.merchantId ?? null) : null;
  const accountId = input.targetType === "account" ? (input.accountId ?? null) : null;
  const creditCardId = input.targetType === "credit_card" ? (input.creditCardId ?? null) : null;
  if (merchantId && !(await merchantsRepository.get(merchantId, context)))
    throw new NotFoundError("Merchant");
  if (accountId && !(await accountsRepository.get(accountId, context)))
    throw new NotFoundError("Account");
  if (creditCardId && !(await creditCardsRepository.findById(context.householdId, creditCardId)))
    throw new NotFoundError("Credit card");
  if (input.categoryId && !(await categoriesRepository.get(input.categoryId, context)))
    throw new NotFoundError("Category");
  const tagIds = await validateTagIds(context, input.tagIds);

  await importMappingsRepository.upsert(context, {
    sourceKey: input.sourceKey,
    displayName: sample.counterparty || sample.description,
    targetType: input.targetType,
    merchantId,
    accountId,
    creditCardId,
    categoryId: input.categoryId ?? null,
    tagIds: (tagIds ?? []) as string[],
  });
  await reevaluate(context, batch);
  return toBatchResponse(context, batch);
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

export async function startImport(
  context: HouseholdContext,
  id: string,
  input: StartImportInput,
): Promise<ImportBatch> {
  const batch = await requireBatch(context, id);
  if (batch.status === "queued" || batch.status === "importing")
    throw new ValidationError("This import is already running");
  const target = await loadTarget(context, batch);
  if (!target)
    throw new ValidationError(
      batch.sourceKind === "credit_card"
        ? "Choose the credit card for this import first"
        : "Choose the account for this import first",
    );

  await reevaluate(context, batch);
  const rows = await importRowsRepository.listAll(id);
  const pending = rows.filter((row) => row.outcome !== "created" && row.outcome !== "duplicate");
  const blocked = pending.filter((row) => !row.skip && hasBlockingIssue(row.issues));
  if (blocked.length > 0) {
    if (!input.skipInvalid)
      throw new ValidationError(
        `${blocked.length} row${blocked.length === 1 ? "" : "s"} still ha${blocked.length === 1 ? "s" : "ve"} problems. Fix or skip them, or start with "skip invalid rows".`,
      );
    await importRowsRepository.updateMany(
      id,
      blocked.map((r) => r.id),
      { skip: true },
    );
  }

  const updated = await importBatchesRepository.update(id, context, {
    status: "queued",
    errorMessage: null,
    startedAt: new Date(),
    finishedAt: null,
  });
  if (!updated) throw new NotFoundError("Import");
  await enqueueImportBatch(id);
  return toBatchResponse(context, updated);
}

export type { ImportReconciliation };
