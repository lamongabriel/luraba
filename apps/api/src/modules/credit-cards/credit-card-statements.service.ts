import type {
  CardRoundingPatterns,
  CardStatementImport,
  CardStatementResult,
  InstallmentAudit,
  ReconcileCycleResult,
} from "@luraba/contracts";
import {
  cardInstallmentAuditsTable,
  cardRoundingPatternsTable,
  cardStatementImportsTable,
  cardStatementLinesTable,
} from "@luraba/db/schema";
import { creditCardBillingCyclesTable } from "@luraba/db/schemas/credit-card-billing-cycles.schema";
import { creditCardInstallmentsTable } from "@luraba/db/schemas/credit-card-installments.schema";
import { creditCardPurchasesTable } from "@luraba/db/schemas/credit-card-purchases.schema";
import { merchantsTable } from "@luraba/db/schemas/merchants.schema";
import { transactionsTable } from "@luraba/db/schemas/transactions.schema";
import {
  type MatchableInstallment,
  matchStatement,
  parseMonthKey,
  type StatementMatch,
} from "@luraba/domain";
import { and, desc, eq } from "drizzle-orm";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";
import { assertNotArchived } from "@/modules/accounts/accounts.guards";
import { NotFoundError, ValidationError } from "@/shared/errors";
import { recomputeCardAllocations } from "./credit-card-allocations";
import { getBillingCycle, listCyclesThroughMonth } from "./credit-card-cycles.service";
import { loadPurchase, writeInstallmentChange } from "./credit-card-purchases.service";
import { learnRoundingPatterns, recordInstallmentAudit } from "./credit-card-reconciliation";
import * as creditCardsRepository from "./credit-cards.repository";
import type {
  CardStatementDto,
  CreditCardCycleDetailResponse,
  CreditCardCycleSummary,
  ReconcileCycleDto,
} from "./credit-cards.types";
import {
  type ParsedCardStatement,
  parseCardStatement,
  STATEMENT_ISSUER_LABELS,
  StatementParseError,
} from "./statements/statement.parsers";

type InvoiceItem = MatchableInstallment & { billingCycleId: string };

async function resolveInvoice(
  context: HouseholdContext,
  card: Awaited<ReturnType<typeof creditCardsRepository.findByIdOrThrow>>,
  month: string,
): Promise<CreditCardCycleSummary> {
  const cycles = await listCyclesThroughMonth(context, card, parseMonthKey(month));
  const cycle = cycles
    .filter((candidate) => candidate.dueDate.slice(0, 7) === month)
    .sort((left, right) => (left.dueDate < right.dueDate ? -1 : 1))[0];
  if (!cycle) throw new ValidationError(`${card.name} has no invoice due in ${month}`);
  return cycle;
}

async function loadInvoiceItems(creditCardId: string, cycleId: string): Promise<InvoiceItem[]> {
  const rows = await db
    .select({
      installmentId: creditCardInstallmentsTable.id,
      purchaseId: creditCardInstallmentsTable.purchaseId,
      installmentNumber: creditCardInstallmentsTable.installmentNumber,
      installmentCount: creditCardPurchasesTable.installmentCount,
      amount: creditCardInstallmentsTable.amount,
      billingCycleId: creditCardInstallmentsTable.billingCycleId,
      description: transactionsTable.description,
      originalDescription: transactionsTable.originalDescription,
      merchantName: merchantsTable.name,
    })
    .from(creditCardInstallmentsTable)
    .innerJoin(
      creditCardPurchasesTable,
      eq(creditCardPurchasesTable.id, creditCardInstallmentsTable.purchaseId),
    )
    .innerJoin(transactionsTable, eq(transactionsTable.id, creditCardPurchasesTable.transactionId))
    .leftJoin(merchantsTable, eq(merchantsTable.id, transactionsTable.merchantId))
    .where(
      and(
        eq(creditCardInstallmentsTable.creditCardId, creditCardId),
        eq(creditCardInstallmentsTable.billingCycleId, cycleId),
      ),
    )
    .orderBy(creditCardInstallmentsTable.id);
  return rows;
}

function parse(dto: CardStatementDto): ParsedCardStatement {
  try {
    return parseCardStatement({
      fileName: dto.fileName,
      text: dto.content,
      issuer: dto.issuer,
    });
  } catch (error) {
    if (error instanceof StatementParseError) throw new ValidationError(error.message);
    throw error;
  }
}

type Evaluation = {
  parsed: ParsedCardStatement;
  cycle: CreditCardCycleSummary;
  items: InvoiceItem[];
  matches: StatementMatch[];
  missing: number[];
  extra: string[];
  issuerTotal: number;
  totalBefore: number;
  totalAfter: number;
};

async function evaluate(
  context: HouseholdContext,
  card: Awaited<ReturnType<typeof creditCardsRepository.findByIdOrThrow>>,
  dto: CardStatementDto,
): Promise<Evaluation> {
  const parsed = parse(dto);
  const cycle = await resolveInvoice(context, card, dto.month);
  const items = await loadInvoiceItems(card.id, cycle.id);
  const result = matchStatement(parsed.lines, items);
  const issuerTotal = dto.issuerTotal ?? parsed.total;
  if (issuerTotal <= 0) {
    throw new ValidationError(
      "Could not work out the invoice total from the file; send issuerTotal with the closed total",
    );
  }
  const correction = result.matches
    .filter((match) => match.status === "corrected")
    .reduce((total, match) => total + match.difference, 0);
  return {
    parsed,
    cycle,
    items,
    matches: result.matches,
    missing: result.missing,
    extra: result.extra,
    issuerTotal,
    totalBefore: cycle.statementAmount,
    totalAfter: cycle.statementAmount + correction,
  };
}

function summarize(evaluation: Evaluation) {
  const count = (status: StatementMatch["status"]) =>
    evaluation.matches.filter((match) => match.status === status).length;
  return {
    matched: count("matched"),
    corrected: count("corrected"),
    review: count("review"),
    missing: evaluation.missing.length,
    extra: evaluation.extra.length,
  };
}

function buildResult(
  evaluation: Evaluation,
  options: { dryRun: boolean; importId: string | null; reconciled: boolean; totalAfter: number },
): CardStatementResult {
  const { parsed, cycle, items } = evaluation;
  const byLine = new Map(evaluation.matches.map((match) => [match.lineIndex, match]));
  const itemsById = new Map(items.map((item) => [item.installmentId, item]));
  const missing = new Set(evaluation.missing);

  const toLine = (
    line: ParsedCardStatement["lines"][number],
    status: CardStatementResult["lines"][number]["status"],
  ): CardStatementResult["lines"][number] => {
    const match = byLine.get(line.index);
    const item = match ? itemsById.get(match.installmentId) : undefined;
    return {
      index: line.index,
      date: line.date,
      description: line.description,
      amount: line.amount,
      kind: line.kind,
      installment: line.installment,
      status,
      difference: match ? match.difference : null,
      installmentId: match?.installmentId ?? null,
      purchaseId: match?.purchaseId ?? null,
      purchaseDescription: item?.description ?? null,
      lurabaAmount: item?.amount ?? null,
    };
  };

  const lines = [
    ...parsed.lines.map((line) => {
      const match = byLine.get(line.index);
      return toLine(line, match ? match.status : missing.has(line.index) ? "missing" : "missing");
    }),
    ...parsed.netted.map((line) => toLine(line, "netted")),
    ...parsed.payments.map((line) => toLine(line, "payment")),
  ].sort((left, right) => left.index - right.index);

  return {
    dryRun: options.dryRun,
    issuer: parsed.issuer,
    month: cycle.dueDate.slice(0, 7),
    billingCycleId: cycle.id,
    closingDate: cycle.closingDate,
    dueDate: cycle.dueDate,
    issuerTotal: evaluation.issuerTotal,
    lurabaTotalBefore: evaluation.totalBefore,
    lurabaTotalAfter: options.totalAfter,
    remainingDifference: options.totalAfter - evaluation.issuerTotal,
    reconciled: options.reconciled,
    summary: summarize(evaluation),
    lines,
    extra: evaluation.extra.flatMap((id) => {
      const item = itemsById.get(id);
      return item
        ? [
            {
              installmentId: item.installmentId,
              purchaseId: item.purchaseId,
              description: item.description,
              installmentNumber: item.installmentNumber,
              installmentCount: item.installmentCount,
              amount: item.amount,
            },
          ]
        : [];
    }),
    warnings: parsed.warnings,
    importId: options.importId,
  };
}

/** What importing the statement would do. Nothing is written. */
export async function previewStatement(
  context: HouseholdContext,
  creditCardId: string,
  dto: CardStatementDto,
): Promise<CardStatementResult> {
  const card = await creditCardsRepository.findByIdOrThrow(context.householdId, creditCardId);
  const evaluation = await evaluate(context, card, dto);
  return buildResult(evaluation, {
    dryRun: true,
    importId: null,
    reconciled: evaluation.totalAfter === evaluation.issuerTotal,
    totalAfter: evaluation.totalAfter,
  });
}

/**
 * Applies a statement in one transaction: every matched installment within the correction tolerance takes the
 * statement's amount (purchase total, ledger and budget follow, an audit row records it), payments are laid over the
 * invoices again, and the invoice is marked reconciled when its total equals the issuer's. Differences above the
 * tolerance, missing lines and installments not on the statement are reported and change nothing.
 */
export async function applyStatement(
  context: HouseholdContext,
  creditCardId: string,
  dto: CardStatementDto,
): Promise<CardStatementResult> {
  const card = await creditCardsRepository.findByIdOrThrow(context.householdId, creditCardId);
  assertNotArchived(card, "Credit card");
  const evaluation = await evaluate(context, card, dto);
  const { parsed, cycle } = evaluation;
  const lineByIndex = new Map(parsed.lines.map((line) => [line.index, line]));
  const itemsById = new Map(evaluation.items.map((item) => [item.installmentId, item]));
  const month = cycle.dueDate.slice(0, 7);
  const origin = `from ${STATEMENT_ISSUER_LABELS[parsed.issuer]} ${month} statement`;
  const summary = summarize(evaluation);

  const outcome = await db.transaction(async (tx) => {
    const [saved] = await tx
      .insert(cardStatementImportsTable)
      .values({
        householdId: context.householdId,
        creditCardId: card.id,
        billingCycleId: cycle.id,
        issuer: parsed.issuer,
        fileName: dto.fileName.slice(0, 255),
        issuerTotal: evaluation.issuerTotal,
        matchedCount: summary.matched,
        correctedCount: summary.corrected,
        reviewCount: summary.review,
        missingCount: summary.missing,
        extraCount: summary.extra,
        createdByUserId: context.userId,
      })
      .returning({ id: cardStatementImportsTable.id });
    if (!saved) throw new Error("Could not save the statement import");

    for (const match of evaluation.matches.filter((entry) => entry.status === "corrected")) {
      const line = lineByIndex.get(match.lineIndex);
      const item = itemsById.get(match.installmentId);
      if (!line || !item) continue;
      const purchase = await loadPurchase(context.householdId, card.id, item.purchaseId, tx);
      await writeInstallmentChange(tx, context, card, purchase, {
        installmentId: item.installmentId,
        amount: line.amount,
        billingCycleId: item.billingCycleId,
        total: purchase.amount - item.amount + line.amount,
      });
      await recordInstallmentAudit(tx, {
        householdId: context.householdId,
        creditCardId: card.id,
        purchaseId: item.purchaseId,
        installmentId: item.installmentId,
        billingCycleId: item.billingCycleId,
        installmentNumber: item.installmentNumber,
        previousAmount: item.amount,
        newAmount: line.amount,
        source: "statement",
        statementImportId: saved.id,
        description: item.description,
        origin,
        userId: context.userId,
      });
    }

    // Payments are laid over the corrected invoices again: paid == min(statement, payments), no phantom cents.
    await recomputeCardAllocations(tx, card, context.timezone);

    const [after] = await tx
      .select({ statementAmount: creditCardBillingCyclesTable.statementAmount })
      .from(creditCardBillingCyclesTable)
      .where(eq(creditCardBillingCyclesTable.id, cycle.id));
    const totalAfter = after?.statementAmount ?? evaluation.totalAfter;
    const reconciled = totalAfter === evaluation.issuerTotal;
    await tx
      .update(creditCardBillingCyclesTable)
      .set(
        reconciled
          ? { reconciledAt: new Date(), issuerTotal: evaluation.issuerTotal }
          : { reconciledAt: null, issuerTotal: null },
      )
      .where(eq(creditCardBillingCyclesTable.id, cycle.id));
    await tx
      .update(cardStatementImportsTable)
      .set({ reconciled })
      .where(eq(cardStatementImportsTable.id, saved.id));

    const result = buildResult(evaluation, {
      dryRun: false,
      importId: saved.id,
      reconciled,
      totalAfter,
    });
    if (result.lines.length > 0) {
      await tx.insert(cardStatementLinesTable).values(
        result.lines.map((line) => ({
          importId: saved.id,
          position: line.index,
          lineDate: line.date,
          description: line.description,
          amount: line.amount,
          kind: line.kind,
          installmentNumber: line.installment?.number ?? null,
          installmentTotal: line.installment?.total ?? null,
          status: line.status,
          installmentId: line.installmentId,
          difference: line.difference,
        })),
      );
    }
    await learnRoundingPatterns(tx, context, card.id);
    return result;
  });
  return outcome;
}

export async function listStatementImports(
  context: HouseholdContext,
  creditCardId: string,
): Promise<CardStatementImport[]> {
  await creditCardsRepository.findByIdOrThrow(context.householdId, creditCardId);
  const rows = await db
    .select()
    .from(cardStatementImportsTable)
    .where(
      and(
        eq(cardStatementImportsTable.creditCardId, creditCardId),
        eq(cardStatementImportsTable.householdId, context.householdId),
      ),
    )
    .orderBy(desc(cardStatementImportsTable.createdAt))
    .limit(100);
  return rows.map((row) => ({
    id: row.id,
    billingCycleId: row.billingCycleId,
    issuer: row.issuer as CardStatementImport["issuer"],
    fileName: row.fileName,
    issuerTotal: row.issuerTotal,
    summary: {
      matched: row.matchedCount,
      corrected: row.correctedCount,
      review: row.reviewCount,
      missing: row.missingCount,
      extra: row.extraCount,
    },
    reconciled: row.reconciled,
    createdAt: row.createdAt.toISOString(),
  }));
}

/**
 * Marks the invoice due in `month` reconciled when its total equals the closed total the issuer printed. A difference
 * changes nothing; the result says by how much it is off so the statement can be imported.
 */
export async function reconcileCycle(
  context: HouseholdContext,
  creditCardId: string,
  input: ReconcileCycleDto,
): Promise<ReconcileCycleResult> {
  const card = await creditCardsRepository.findByIdOrThrow(context.householdId, creditCardId);
  const cycle = await resolveInvoice(context, card, input.month);
  const issuerTotal = input.issuerTotal;
  const reconciled = cycle.statementAmount === issuerTotal;
  if (reconciled) {
    await db.transaction(async (tx) => {
      await tx
        .update(creditCardBillingCyclesTable)
        .set({ reconciledAt: new Date(), issuerTotal })
        .where(eq(creditCardBillingCyclesTable.id, cycle.id));
      await learnRoundingPatterns(tx, context, card.id);
    });
  }
  const [refreshed] = await listCyclesThroughMonth(context, card, parseMonthKey(input.month)).then(
    (cycles) => cycles.filter((candidate) => candidate.id === cycle.id),
  );
  return {
    reconciled,
    issuerTotal,
    statementAmount: cycle.statementAmount,
    difference: cycle.statementAmount - issuerTotal,
    cycle: refreshed ?? cycle,
  } as ReconcileCycleResult;
}

export async function unreconcileCycle(
  context: HouseholdContext,
  creditCardId: string,
  cycleId: string,
): Promise<CreditCardCycleDetailResponse> {
  await creditCardsRepository.findByIdOrThrow(context.householdId, creditCardId);
  const updated = await db
    .update(creditCardBillingCyclesTable)
    .set({ reconciledAt: null, issuerTotal: null })
    .where(
      and(
        eq(creditCardBillingCyclesTable.id, cycleId),
        eq(creditCardBillingCyclesTable.creditCardId, creditCardId),
      ),
    )
    .returning({ id: creditCardBillingCyclesTable.id });
  if (updated.length === 0) throw new NotFoundError("Billing cycle");
  await db.transaction((tx) => learnRoundingPatterns(tx, context, creditCardId));
  return getBillingCycle(context, creditCardId, cycleId);
}

export async function listInstallmentAudits(
  context: HouseholdContext,
  creditCardId: string,
  query: { purchaseId?: string; billingCycleId?: string },
): Promise<InstallmentAudit[]> {
  await creditCardsRepository.findByIdOrThrow(context.householdId, creditCardId);
  const rows = await db
    .select()
    .from(cardInstallmentAuditsTable)
    .where(
      and(
        eq(cardInstallmentAuditsTable.creditCardId, creditCardId),
        eq(cardInstallmentAuditsTable.householdId, context.householdId),
        query.purchaseId ? eq(cardInstallmentAuditsTable.purchaseId, query.purchaseId) : undefined,
        query.billingCycleId
          ? eq(cardInstallmentAuditsTable.billingCycleId, query.billingCycleId)
          : undefined,
      ),
    )
    .orderBy(desc(cardInstallmentAuditsTable.createdAt), desc(cardInstallmentAuditsTable.id))
    .limit(200);
  return rows.map((row) => ({
    id: row.id,
    purchaseId: row.purchaseId,
    installmentId: row.installmentId,
    billingCycleId: row.billingCycleId,
    installmentNumber: row.installmentNumber,
    previousAmount: row.previousAmount,
    newAmount: row.newAmount,
    source: row.source as InstallmentAudit["source"],
    statementImportId: row.statementImportId,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getRoundingPatterns(
  context: HouseholdContext,
  creditCardId: string,
): Promise<CardRoundingPatterns> {
  await creditCardsRepository.findByIdOrThrow(context.householdId, creditCardId);
  const rows = await db
    .select()
    .from(cardRoundingPatternsTable)
    .where(
      and(
        eq(cardRoundingPatternsTable.creditCardId, creditCardId),
        eq(cardRoundingPatternsTable.householdId, context.householdId),
      ),
    );
  const shape = (row: (typeof rows)[number]) => ({
    pattern: row.pattern as "first" | "last" | "middle" | "none",
    roundingMode: row.roundingMode as CardRoundingPatterns["merchants"][number]["roundingMode"],
    samples: row.samples,
  });
  const card = rows.find((row) => row.merchantKey === "");
  return {
    card: card ? shape(card) : null,
    merchants: rows
      .filter((row) => row.merchantKey !== "")
      .map((row) => ({ ...shape(row), merchantId: row.merchantKey })),
  };
}
