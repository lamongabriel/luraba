/**
 * Card invoices must match the issuer to the cent. This file holds the pure rules:
 *
 * - `matchStatement`: pairs the lines of an issuer statement with the installments Luraba has on that invoice.
 * - `detectRoundingPattern` / `learnRoundingPattern`: how an issuer places the leftover cents of a split.
 * - `parseInstallmentPlanText`: "1st installment 364.90, rest 364.88" into exact installment amounts.
 *
 * All amounts are minor units (cents). Nothing here touches the database.
 */

import type { InstallmentRoundingMode } from "./installments.js";
import { MAX_INSTALLMENTS } from "./installments.js";

/** A statement difference up to this many cents is a rounding difference and is corrected automatically. */
export const STATEMENT_CORRECTION_TOLERANCE = 5;
/** A card payment this close (but not equal) to the invoice total is flagged as a rounding mismatch. */
export const PAYMENT_MISMATCH_TOLERANCE = 10;

// ---------------------------------------------------------------------------------------------------------------
// Statement matching
// ---------------------------------------------------------------------------------------------------------------

export type StatementLineKind =
  /** A purchase (single or one installment). */
  | "purchase"
  | "iof"
  | "fee"
  /** Money back on the invoice (refund, reversal, cashback). Negative amount. */
  | "credit";

export type StatementLine = {
  /** Position in the file after parsing; used for deterministic tie-breaking. */
  index: number;
  date: string | null;
  /** Statement text without the "Parcela X/Y" suffix. */
  description: string;
  /** Minor units; positive = charge, negative = credit. */
  amount: number;
  installment: { number: number; total: number } | null;
  kind: StatementLineKind;
};

export type MatchableInstallment = {
  installmentId: string;
  purchaseId: string;
  installmentNumber: number;
  installmentCount: number;
  amount: number;
  description: string;
  originalDescription: string | null;
  merchantName: string | null;
};

export type StatementMatchStatus = "matched" | "corrected" | "review";

export type StatementMatch = {
  lineIndex: number;
  installmentId: string;
  purchaseId: string;
  status: StatementMatchStatus;
  /** Statement amount minus Luraba's amount. Positive: the issuer billed more. */
  difference: number;
  textScore: number;
};

export type StatementMatchResult = {
  matches: StatementMatch[];
  /** Statement lines with no installment in Luraba ("missing purchase"). */
  missing: number[];
  /** Luraba installments on the invoice that no statement line points at ("not on statement"). */
  extra: string[];
};

/** Lowercase, accent-free, alphanumeric tokens. */
export function tokenizeStatementText(value: string): string[] {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim()
    .split(" ")
    .filter((token) => token.length > 0);
}

const STOP_TOKENS = new Set(["parcela", "de", "da", "do", "em", "the", "of", "ltda", "sa", "br"]);

function meaningfulTokens(value: string): string[] {
  return tokenizeStatementText(value).filter((token) => !STOP_TOKENS.has(token));
}

/**
 * How well a statement text and a Luraba text describe the same purchase:
 * 4 same text, 3 one contains the other, 2 half of the words in common, 1 a long word in common, 0 nothing.
 */
export function statementTextScore(
  statementText: string,
  candidates: Array<string | null>,
): number {
  const statement = meaningfulTokens(statementText);
  if (statement.length === 0) return 0;
  const statementJoined = statement.join(" ");
  let best = 0;
  for (const candidate of candidates) {
    if (!candidate) continue;
    const tokens = meaningfulTokens(candidate);
    if (tokens.length === 0) continue;
    const joined = tokens.join(" ");
    if (joined === statementJoined) return 4;
    if (
      Math.min(joined.length, statementJoined.length) >= 3 &&
      (joined.includes(statementJoined) || statementJoined.includes(joined))
    ) {
      best = Math.max(best, 3);
      continue;
    }
    const shared = statement.filter((token) => tokens.includes(token));
    const union = new Set([...statement, ...tokens]).size;
    if (shared.length > 0 && shared.length / union >= 0.5) best = Math.max(best, 2);
    else if (shared.some((token) => token.length >= 4)) best = Math.max(best, 1);
  }
  return best;
}

type Pair = { line: StatementLine; installment: MatchableInstallment; score: number; diff: number };

function tierOf(diff: number, tolerance: number): number {
  const distance = Math.abs(diff);
  if (distance === 0) return 0;
  return distance <= tolerance ? 1 : 2;
}

/**
 * Matches statement lines to the installments Luraba has on the same invoice.
 *
 * A line can match an installment when the installment number and count are the same (a line without "X/Y" only
 * matches a single-installment purchase) and the texts agree (`statementTextScore`). A difference above the
 * tolerance still pairs when the text is a strong match, and is reported as `review`; weaker texts with a large
 * difference are two different things (a missing purchase and a "not on statement" installment). A zero text score
 * only counts for an exact-amount installment of a multi-installment plan.
 *
 * Pairs are taken greedily, best first: exact amount, then within tolerance, then review; then the better text;
 * then the closer amount; then statement order, then installment id. The result never depends on input order
 * beyond `line.index`.
 */
export function matchStatement(
  lines: StatementLine[],
  installments: MatchableInstallment[],
  tolerance = STATEMENT_CORRECTION_TOLERANCE,
): StatementMatchResult {
  const chargeable = lines.filter((line) => line.kind === "purchase" && line.amount > 0);
  const pairs: Pair[] = [];
  for (const line of chargeable) {
    for (const installment of installments) {
      const sameSlot = line.installment
        ? line.installment.number === installment.installmentNumber &&
          line.installment.total === installment.installmentCount
        : installment.installmentCount === 1;
      if (!sameSlot) continue;
      const score = statementTextScore(line.description, [
        installment.originalDescription,
        installment.description,
        installment.merchantName,
      ]);
      const diff = line.amount - installment.amount;
      const tier = tierOf(diff, tolerance);
      if (tier === 2 && score < 3) continue;
      if (score === 0 && !(tier <= 1 && installment.installmentCount > 1)) continue;
      pairs.push({ line, installment, score, diff });
    }
  }
  pairs.sort(
    (a, b) =>
      tierOf(a.diff, tolerance) - tierOf(b.diff, tolerance) ||
      b.score - a.score ||
      Math.abs(a.diff) - Math.abs(b.diff) ||
      a.line.index - b.line.index ||
      (a.installment.installmentId < b.installment.installmentId ? -1 : 1),
  );

  const usedLines = new Set<number>();
  const usedInstallments = new Set<string>();
  const matches: StatementMatch[] = [];
  for (const pair of pairs) {
    if (usedLines.has(pair.line.index) || usedInstallments.has(pair.installment.installmentId)) {
      continue;
    }
    // Zero-score pairs are only trusted when nothing else competes for either side.
    if (pair.score === 0) {
      const rivals = pairs.filter(
        (other) =>
          other !== pair &&
          (other.line.index === pair.line.index ||
            other.installment.installmentId === pair.installment.installmentId) &&
          !usedLines.has(other.line.index) &&
          !usedInstallments.has(other.installment.installmentId),
      );
      if (rivals.length > 0) continue;
    }
    usedLines.add(pair.line.index);
    usedInstallments.add(pair.installment.installmentId);
    const tier = tierOf(pair.diff, tolerance);
    matches.push({
      lineIndex: pair.line.index,
      installmentId: pair.installment.installmentId,
      purchaseId: pair.installment.purchaseId,
      status: tier === 0 ? "matched" : tier === 1 ? "corrected" : "review",
      difference: pair.diff,
      textScore: pair.score,
    });
  }
  matches.sort((a, b) => a.lineIndex - b.lineIndex);

  return {
    matches,
    missing: lines.filter((line) => !usedLines.has(line.index)).map((line) => line.index),
    extra: installments
      .filter((installment) => !usedInstallments.has(installment.installmentId))
      .map((installment) => installment.installmentId),
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Rounding pattern
// ---------------------------------------------------------------------------------------------------------------

/** Where an issuer puts the leftover cents of an even split. `equal` carries no information on its own. */
export type RoundingPatternKind = "first" | "last" | "middle" | "equal" | "irregular";

export type RoundingPatternDetection = {
  kind: RoundingPatternKind;
  /** 1-based installment number that carries the extra cents, for `middle`. */
  position?: number;
};

/** Issuers' rounding differences are a few cents; a bigger spread is a different thing (a fee, another plan). */
const MAX_ROUNDING_SPREAD = 10;

/**
 * Reads the pattern out of a purchase's installment amounts: exactly two distinct values, the higher ones all at the
 * start (`first`), all at the end (`last`) or in between (`middle`). One value is `equal`; anything else (a fee on
 * installment 1, a different plan) is `irregular`.
 */
export function detectRoundingPattern(amounts: number[]): RoundingPatternDetection {
  if (amounts.length < 2) return { kind: "equal" };
  const distinct = [...new Set(amounts)].sort((a, b) => a - b);
  if (distinct.length === 1) return { kind: "equal" };
  const low = distinct[0] as number;
  const high = distinct[1] as number;
  if (distinct.length > 2 || high - low > MAX_ROUNDING_SPREAD) return { kind: "irregular" };
  const highs = amounts.flatMap((amount, index) => (amount === high ? [index] : []));
  const first = highs[0] as number;
  const last = highs[highs.length - 1] as number;
  if (last - first + 1 !== highs.length) return { kind: "irregular" };
  if (first === 0) return { kind: "first" };
  if (last === amounts.length - 1) return { kind: "last" };
  return { kind: "middle", position: first + 1 };
}

/** The pattern an issuer follows, learned from reconciled purchases. `none` = every installment is rounded down. */
export type LearnedRoundingPattern = "first" | "last" | "middle" | "none";

export type LearnedRounding = {
  pattern: LearnedRoundingPattern;
  /** The roundingMode new purchases get by default; null when the pattern cannot be reproduced (`middle`). */
  roundingMode: InstallmentRoundingMode | null;
  /** How many reconciled purchases voted for the winning pattern. */
  samples: number;
};

/**
 * Votes across reconciled purchases (oldest first). Evidence of a remainder (`first`/`last`/`middle`) outranks equal
 * installments, which are also what an exactly divisible price looks like: `none` needs at least two equal lists
 * and no remainder evidence. The majority wins; a tie goes to the most recent purchase.
 */
export function learnRoundingPattern(samples: RoundingPatternKind[]): LearnedRounding | null {
  const counts = new Map<LearnedRoundingPattern, number>();
  let lastEvidence: LearnedRoundingPattern | null = null;
  let equalCount = 0;
  for (const sample of samples) {
    if (sample === "first" || sample === "last" || sample === "middle") {
      counts.set(sample, (counts.get(sample) ?? 0) + 1);
      lastEvidence = sample;
    } else if (sample === "equal") {
      equalCount += 1;
    }
  }
  let winner: LearnedRoundingPattern | null = null;
  let winnerCount = 0;
  for (const [pattern, count] of counts) {
    if (count > winnerCount || (count === winnerCount && pattern === lastEvidence)) {
      winner = pattern;
      winnerCount = count;
    }
  }
  if (!winner) {
    if (equalCount < 2) return null;
    return { pattern: "none", roundingMode: "round_down_all", samples: equalCount };
  }
  const roundingMode: InstallmentRoundingMode | null =
    winner === "first" ? "remainder_first" : winner === "last" ? "remainder_last" : null;
  return { pattern: winner, roundingMode, samples: winnerCount };
}

// ---------------------------------------------------------------------------------------------------------------
// Installment plan shorthand
// ---------------------------------------------------------------------------------------------------------------

export type InstallmentPlanTextResult =
  | { ok: true; amounts: number[] }
  | { ok: false; error: string };

const ORDINAL_WORDS: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
  eighth: 8,
  ninth: 9,
  tenth: 10,
};

/** "1,234.56", "1.234,56", "364,90", "364.9" and "R$ 26.63" into minor units; null when it is not an amount. */
export function parseLooseAmount(input: string): number | null {
  const text = input.replace(/R\$|\$|\s/gu, "");
  if (!/^\d[\d.,]*$/u.test(text)) return null;
  const lastDot = text.lastIndexOf(".");
  const lastComma = text.lastIndexOf(",");
  const decimalAt = Math.max(lastDot, lastComma);
  let whole = text;
  let fraction = "";
  if (decimalAt >= 0) {
    const digitsAfter = text.length - decimalAt - 1;
    const separators = (text.match(/[.,]/gu) ?? []).length;
    // "1.234" is a thousands separator unless it is the only one and not three digits long.
    const isDecimal = digitsAfter <= 2 || (digitsAfter !== 3 && separators === 1);
    if (isDecimal) {
      whole = text.slice(0, decimalAt);
      fraction = text.slice(decimalAt + 1);
    }
  }
  whole = whole.replace(/[.,]/gu, "");
  if (fraction.length > 2) return null;
  const minor = Number(whole || "0") * 100 + Number(fraction.padEnd(2, "0") || "0");
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null;
}

const AMOUNT = String.raw`(?:R\$|\$)?\s*\d[\d.,]*`;

/**
 * Turns shorthand into exact installment amounts. Understood (case-insensitive, clauses split by commas, "then" or
 * "and"):
 *
 * - `1st installment 364.90, rest 364.88` (also "first", "2nd", "last", "others", "remaining")
 * - `364.90 then 364.88 x2` and `26.63 x3` / `3x 26.63` (repeat an amount)
 * - `364.90, 364.88, 364.88` (one amount per installment, in order)
 *
 * The count comes from `installmentCount` when given (needed for "rest" and "last"), otherwise from the clauses.
 */
export function parseInstallmentPlanText(
  text: string,
  installmentCount?: number,
): InstallmentPlanTextResult {
  const fail = (error: string): InstallmentPlanTextResult => ({ ok: false, error });
  const clauses = text
    .split(/,\s+|\s*;\s*|\s+\bthen\b\s+|\s+\band\b\s+/iu)
    .map((clause) => clause.trim())
    .filter((clause) => clause !== "");
  if (clauses.length === 0)
    return fail("Describe the installments, e.g. 1st installment 364.90, rest 364.88");

  const slots = new Map<number, number>();
  let cursor = 0;
  let restAmount: number | null = null;
  let lastAmount: number | null = null;
  let maxIndex = -1;

  const nextFree = () => {
    while (slots.has(cursor)) cursor += 1;
    return cursor;
  };
  const place = (index: number, amount: number) => {
    slots.set(index, amount);
    maxIndex = Math.max(maxIndex, index);
  };
  const amountOf = (raw: string) => parseLooseAmount(raw);

  for (const clause of clauses) {
    const rest = new RegExp(
      String.raw`^(?:the\s+)?(?:rest|others?|remaining|remainder)(?:\s+installments?)?(?:\s+(?:are|is|of|at|=|:))?\s*(${AMOUNT})$`,
      "iu",
    ).exec(clause);
    if (rest) {
      const value = amountOf(rest[1] as string);
      if (value === null) return fail(`Could not read the amount in "${clause}"`);
      restAmount = value;
      continue;
    }
    const ordinal = new RegExp(
      String.raw`^(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|last|\d+(?:st|nd|rd|th))(?:\s+installment)?(?:\s+(?:is|of|at|=|:))?\s*(${AMOUNT})$`,
      "iu",
    ).exec(clause);
    if (ordinal) {
      const value = amountOf(ordinal[2] as string);
      if (value === null) return fail(`Could not read the amount in "${clause}"`);
      const word = (ordinal[1] as string).toLowerCase();
      if (word === "last") {
        lastAmount = value;
        continue;
      }
      const position = ORDINAL_WORDS[word] ?? Number.parseInt(word, 10);
      if (!Number.isInteger(position) || position < 1 || position > MAX_INSTALLMENTS) {
        return fail(`"${word}" is not a valid installment position`);
      }
      place(position - 1, value);
      continue;
    }
    const trailing = new RegExp(String.raw`^(${AMOUNT})\s*(?:x|×)\s*(\d+)$`, "iu").exec(clause);
    const leading = new RegExp(String.raw`^(\d+)\s*(?:x|×)\s*(${AMOUNT})$`, "iu").exec(clause);
    const repeated = trailing
      ? { amountRaw: trailing[1] as string, timesRaw: trailing[2] as string }
      : leading
        ? { amountRaw: leading[2] as string, timesRaw: leading[1] as string }
        : null;
    if (repeated) {
      const value = amountOf(repeated.amountRaw);
      const times = Number.parseInt(repeated.timesRaw, 10);
      if (value === null || !Number.isInteger(times) || times < 1 || times > MAX_INSTALLMENTS) {
        return fail(`Could not read "${clause}"`);
      }
      for (let step = 0; step < times; step += 1) place(nextFree(), value);
      continue;
    }
    const bare = new RegExp(`^(${AMOUNT})$`, "iu").exec(clause);
    if (bare) {
      const value = amountOf(bare[1] as string);
      if (value === null) return fail(`Could not read the amount in "${clause}"`);
      place(nextFree(), value);
      continue;
    }
    return fail(`Could not understand "${clause}"`);
  }

  const count = installmentCount ?? maxIndex + 1;
  if (installmentCount !== undefined && maxIndex + 1 > installmentCount) {
    return fail(
      `The text describes ${maxIndex + 1} installments but the purchase has ${installmentCount}`,
    );
  }
  if ((restAmount !== null || lastAmount !== null) && installmentCount === undefined) {
    // "rest" and "last" need to know how many installments there are.
    return fail('Say how many installments there are (needed for "rest" and "last")');
  }
  if (count < 1) return fail("Say how many installments there are");
  if (count > MAX_INSTALLMENTS)
    return fail(`Installments must be between 1 and ${MAX_INSTALLMENTS}`);
  if (lastAmount !== null) {
    if (slots.has(count - 1)) return fail("The last installment is given twice");
    slots.set(count - 1, lastAmount);
  }
  const amounts: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const value = slots.get(index) ?? restAmount;
    if (value === null || value === undefined) {
      return fail(
        `Installment ${index + 1} has no amount; add a "rest" amount or list every installment`,
      );
    }
    amounts.push(value);
  }
  return { ok: true, amounts };
}
