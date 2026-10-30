import type {
  ImportIssue,
  ImportMapping,
  ImportRowKind,
  ImportSourceKind,
} from "@luraba/contracts/imports";
import { valueSourceKey } from "./imports.normalize";
import type {
  DuplicateMark,
  ImportMappingRecord,
  ImportRowRecord,
  RowEvaluation,
} from "./imports.types";

/**
 * Decides, for every staged row, what it will become and what is wrong with it. Pure and cheap, so
 * it re-runs after every edit. It never changes `skip` (that is the user's decision, seeded by
 * duplicate detection).
 */
export type EvaluationContext = {
  sourceKind: ImportSourceKind;
  /** The Luraba account or card chosen in step 2, with its currency. */
  target: { id: string; currencyCode: string } | null;
  statementCurrency: string | null;
  mappings: ReadonlyMap<string, ImportMappingRecord>;
  categoryTypes: ReadonlyMap<string, "expense" | "income">;
  accounts: ReadonlyMap<string, { currencyCode: string }>;
  cards: ReadonlyMap<string, { currencyCode: string }>;
  /** Pair keys already recorded by an earlier import (the same money seen from another statement). */
  existingPairKeys: ReadonlySet<string>;
  /**
   * Which occurrence of its base pair key each row is (1-based, in file order), so two identical
   * transfers on one day stay two movements. Fill it with `withPairOccurrences`.
   */
  pairOccurrence: ReadonlyMap<string, number>;
};

/**
 * Identifies movements that appear in two statements: a transfer between two imported accounts,
 * and a card payment seen from the bank and from the card. The first one imported wins.
 */
export function pairKeyFor(
  row: Pick<ImportRowRecord, "postedDate" | "amount">,
  kind: ImportRowKind | null,
  mapping: ImportMapping,
  sourceKind: ImportSourceKind,
  targetId: string | undefined,
): string | null {
  if (!row.postedDate || row.amount === null || !targetId) return null;
  const date = row.postedDate.toISOString().slice(0, 10);
  const amount = Math.abs(row.amount);
  if (kind === "transfer" && mapping.accountId) {
    const [from, to] =
      row.amount < 0 ? [targetId, mapping.accountId] : [mapping.accountId, targetId];
    return `transfer|${date}|${amount}|${from}>${to}`;
  }
  if (kind === "card_payment") {
    const cardId = sourceKind === "credit_card" ? targetId : mapping.creditCardId;
    return cardId ? `card-payment|${date}|${amount}|${cardId}` : null;
  }
  return null;
}

/** The pair key of a row including its occurrence number; null when the row has no pair key. */
export function numberedPairKey(
  row: ImportRowRecord,
  kind: ImportRowKind | null,
  mapping: ImportMapping,
  context: EvaluationContext,
): string | null {
  const base = pairKeyFor(row, kind, mapping, context.sourceKind, context.target?.id);
  return base ? `${base}#${context.pairOccurrence.get(row.id) ?? 1}` : null;
}

/** Numbers repeated pair keys in file order. Returns the context with `pairOccurrence` filled. */
export function withPairOccurrences(
  rows: readonly ImportRowRecord[],
  context: EvaluationContext,
): EvaluationContext {
  const seen = new Map<string, number>();
  const pairOccurrence = new Map<string, number>();
  const ordered = [...rows].sort((a, b) => a.rowIndex - b.rowIndex);
  for (const row of ordered) {
    const { kind } = evaluateRow(row, context);
    const base = pairKeyFor(
      row,
      kind,
      effectiveMapping(row, context.mappings),
      context.sourceKind,
      context.target?.id,
    );
    if (!base) continue;
    const next = (seen.get(base) ?? 0) + 1;
    seen.set(base, next);
    pairOccurrence.set(row.id, next);
  }
  return { ...context, pairOccurrence };
}

const EMPTY_MAPPING: ImportMapping = {
  targetType: "none",
  merchantId: null,
  accountId: null,
  creditCardId: null,
  categoryId: null,
  tagIds: [],
};

export function groupMapping(record: ImportMappingRecord | undefined): ImportMapping | null {
  if (!record) return null;
  return {
    targetType: record.targetType as ImportMapping["targetType"],
    merchantId: record.merchantId,
    accountId: record.accountId,
    creditCardId: record.creditCardId,
    categoryId: record.categoryId,
    tagIds: record.tagIds,
  };
}

export function effectiveMapping(
  row: Pick<ImportRowRecord, "merchantId" | "categoryId" | "tagIds" | "sourceKey" | "hints">,
  mappings: ReadonlyMap<string, ImportMappingRecord>,
): ImportMapping {
  const group = groupMapping(mappings.get(row.sourceKey)) ?? EMPTY_MAPPING;
  const merchantId = row.merchantId ?? (group.targetType === "merchant" ? group.merchantId : null);

  // What the user mapped the file's own category and tag texts to (step 3).
  const categoryValue = row.hints.categoryValue as string | undefined;
  const valueCategoryId = categoryValue
    ? (mappings.get(valueSourceKey("category", categoryValue))?.categoryId ?? null)
    : null;
  const tagValues = (row.hints.tagValues as string[] | undefined) ?? [];
  const valueTagIds = tagValues.flatMap(
    (tag) => mappings.get(valueSourceKey("tag", tag))?.tagIds ?? [],
  );
  const tagIds = row.tagIds ?? [...new Set([...group.tagIds, ...valueTagIds])];

  return {
    targetType: row.merchantId ? "merchant" : group.targetType,
    merchantId,
    accountId: row.merchantId ? null : group.accountId,
    creditCardId: row.merchantId ? null : group.creditCardId,
    categoryId: row.categoryId ?? valueCategoryId ?? group.categoryId,
    tagIds,
  };
}

export function hintLabel(row: Pick<ImportRowRecord, "hints">): string | null {
  const movement = row.hints.movement;
  if (movement === "investment") return "Looks like an investment move.";
  if (movement === "card_payment") return "Looks like a card payment.";
  if (movement === "card_refund") return "A refund or reversal.";
  return null;
}

export function duplicateMarkOf(row: Pick<ImportRowRecord, "hints">): DuplicateMark | null {
  const mark = row.hints.duplicate as DuplicateMark | undefined;
  return mark?.level ? mark : null;
}

export function evaluateRow(row: ImportRowRecord, context: EvaluationContext): RowEvaluation {
  const issues: ImportIssue[] = [];
  const error = (code: string, message: string) =>
    issues.push({ code, severity: "error", message });
  const warn = (code: string, message: string) =>
    issues.push({ code, severity: "warning", message });
  const info = (code: string, message: string) => issues.push({ code, severity: "info", message });

  const problems = (row.hints.problems as string[] | undefined) ?? [];
  for (const message of problems) error("invalid_value", message);
  if (row.postedDate === null && problems.length === 0) error("invalid_date", "Date is missing.");
  if (row.amount === null && problems.length === 0) error("invalid_amount", "Amount is missing.");
  if (row.amount === 0) error("invalid_amount", "Amount is zero.");
  if (row.amount === null || row.amount === 0 || row.postedDate === null) {
    return { kind: null, issues };
  }

  const mapping = effectiveMapping(row, context.mappings);
  const movement = row.hints.movement as string | undefined;
  const outgoing = row.amount < 0;
  let kind: ImportRowKind | null = null;

  if (!context.target) {
    error(
      "no_target",
      context.sourceKind === "credit_card" ? "Choose a card." : "Choose an account.",
    );
  } else if (
    context.statementCurrency &&
    context.statementCurrency !== context.target.currencyCode
  ) {
    error(
      "currency_mismatch",
      `File is ${context.statementCurrency}, target is ${context.target.currencyCode}.`,
    );
  }

  if (context.sourceKind === "bank_account") {
    if (mapping.targetType === "account") {
      if (!mapping.accountId) error("needs_mapping", "Choose the account.");
      else if (mapping.accountId === context.target?.id)
        error("same_account", "Choose a different account.");
      else {
        const other = context.accounts.get(mapping.accountId);
        if (other && context.target && other.currencyCode !== context.target.currencyCode)
          error("transfer_currency", "Transfers across currencies aren't supported.");
        kind = "transfer";
      }
    } else if (mapping.targetType === "credit_card") {
      if (!mapping.creditCardId) error("needs_mapping", "Choose the card.");
      else if (!outgoing) error("card_payment_direction", "A card payment must be money out.");
      else kind = "card_payment";
    } else if (movement === "investment" || movement === "card_payment") {
      error(
        "needs_mapping",
        movement === "investment"
          ? "Investment move: choose the account."
          : "Card payment: choose the card.",
      );
    } else {
      kind = outgoing ? "expense" : "income";
    }
  } else if (outgoing) {
    kind = "card_purchase";
    if (mapping.targetType === "account" || mapping.targetType === "credit_card")
      error("mapping_target_mismatch", "Card purchases map to merchants only.");
  } else if (movement === "card_payment" || mapping.targetType === "account") {
    if (!mapping.accountId) error("needs_mapping", "Choose the paying account.");
    else kind = "card_payment";
  } else {
    kind = "unsupported";
    warn("unsupported_refund", "Refunds can't be imported. Remove it.");
  }

  if (kind === "expense" || kind === "income" || kind === "card_purchase") {
    if (mapping.categoryId) {
      const type = context.categoryTypes.get(mapping.categoryId);
      const expected = kind === "income" ? "income" : "expense";
      if (type && type !== expected)
        error("category_type", `Category is ${type}, row is ${expected}.`);
    }
  }
  if (row.hints.netted) {
    info("netted", "Offsets another row.");
  }
  const pairKey = numberedPairKey(row, kind, mapping, context);
  if (pairKey && context.existingPairKeys.has(pairKey)) {
    info("duplicate", "Already imported from the other statement.");
  }
  const duplicate = duplicateMarkOf(row);
  if (duplicate) {
    if (duplicate.level === "exact") info("duplicate", duplicate.message);
    else warn("possible_duplicate", duplicate.message);
  }

  return { kind, issues };
}

export function hasBlockingIssue(issues: readonly ImportIssue[]): boolean {
  return issues.some((issue) => issue.severity === "error");
}

/** A row needs a decision when it is blocked on a missing mapping. */
export function isUnmapped(issues: readonly ImportIssue[]): boolean {
  return issues.some((issue) => issue.code === "needs_mapping");
}
