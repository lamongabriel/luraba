import type { StatementLine, StatementLineKind } from "@luraba/domain";
import { detectParser } from "@/modules/imports/parsers/registry";
import {
  collapseSpaces,
  normalizeKey,
  parseAmount,
  parseDate,
  parseDelimited,
} from "@/modules/imports/parsers/text";

/**
 * Reads an issuer's invoice statement into `StatementLine`s. Pure: text in, lines out. Issuer layouts differ, so each
 * is a small profile over the same table (header names, date and amount formats, where "Parcela X/Y" lives); OFX goes
 * through the imports module's OFX adapter. PDF statements are not read (no reliable text extractor in the repo).
 */

export const STATEMENT_ISSUERS = ["nubank", "inter", "xp", "inter_global", "ofx"] as const;
export type StatementIssuer = (typeof STATEMENT_ISSUERS)[number];

export const STATEMENT_ISSUER_LABELS: Record<StatementIssuer, string> = {
  nubank: "Nubank",
  inter: "Inter",
  xp: "XP",
  inter_global: "Inter Global",
  ofx: "OFX",
};

export type ParsedStatementLine = StatementLine & {
  /** The text exactly as the statement printed it. */
  rawDescription: string;
};

export type ParsedCardStatement = {
  issuer: StatementIssuer;
  /** Lines that count toward the invoice total (payments and netted IOF pairs are left out). */
  lines: ParsedStatementLine[];
  /** Payment lines ("Pagamento recebido"): informational, never part of the total. */
  payments: ParsedStatementLine[];
  /** IOF charges and their refunds that cancelled each other out. */
  netted: ParsedStatementLine[];
  /** The invoice total the file implies: the sum of `lines` (or the OFX closing balance when it has one). */
  total: number;
  warnings: string[];
};

export class StatementParseError extends Error {}

type Column = "date" | "description" | "amount" | "type" | "installment";
type Profile = {
  issuer: StatementIssuer;
  /** Header aliases (normalized) per column; every required one must be present. */
  columns: Record<Column, string[]>;
  required: Column[];
  /** Headers that identify this layout among the others. */
  signature: string[];
};

const PROFILES: Profile[] = [
  {
    issuer: "nubank",
    columns: {
      date: ["date", "data"],
      description: ["title", "titulo", "descricao"],
      amount: ["amount", "valor"],
      type: [],
      installment: [],
    },
    required: ["date", "description", "amount"],
    signature: ["title"],
  },
  {
    issuer: "inter",
    columns: {
      date: ["data", "data da compra"],
      description: ["lancamento", "descricao"],
      amount: ["valor"],
      type: ["tipo"],
      installment: ["parcela"],
    },
    required: ["date", "description", "amount"],
    signature: ["lancamento"],
  },
  {
    issuer: "xp",
    columns: {
      date: ["data", "data da compra"],
      description: ["estabelecimento", "descricao"],
      amount: ["valor"],
      type: ["tipo"],
      installment: ["parcela"],
    },
    required: ["date", "description", "amount"],
    signature: ["estabelecimento"],
  },
  {
    issuer: "inter_global",
    columns: {
      date: ["date"],
      description: ["description", "merchant"],
      amount: ["amount"],
      type: ["type", "category"],
      installment: ["installment"],
    },
    required: ["date", "description", "amount"],
    signature: ["description"],
  },
];

function headerKeys(headers: string[]): string[] {
  return headers.map((header) => normalizeKey(header));
}

function pickProfile(keys: string[], forced?: StatementIssuer): Profile | null {
  const candidates = forced ? PROFILES.filter((profile) => profile.issuer === forced) : PROFILES;
  for (const profile of candidates) {
    const hasAll = profile.required.every((column) =>
      profile.columns[column].some((alias) => keys.includes(alias)),
    );
    const hasSignature = profile.signature.some((alias) => keys.includes(alias));
    if (hasAll && (forced || hasSignature)) return profile;
  }
  return null;
}

function detectDelimiter(text: string): string {
  const head = text.split(/\r?\n/u).find((line) => line.trim() !== "") ?? "";
  const counts = [",", ";", "\t"].map((delimiter) => head.split(delimiter).length);
  const best = Math.max(...counts);
  return [",", ";", "\t"][counts.indexOf(best)] ?? ",";
}

/** "364.90", "364,90", "1.234,56", "R$ 1.234,56", "- R$ 10,00": the decimal separator is whichever ends the number. */
export function parseStatementAmount(raw: string): number | null {
  const text = raw.trim();
  if (text === "") return null;
  const decimal = /,\d{1,2}\)?$/u.test(text) ? "," : ".";
  return parseAmount(text, decimal);
}

const INSTALLMENT_PATTERN = /(?:parcela|installment|parc\.?)\s*(\d+)\s*(?:\/|de|of)\s*(\d+)/iu;
const BARE_INSTALLMENT_PATTERN = /^\s*(\d+)\s*(?:\/|de|of)\s*(\d+)\s*$/iu;

function readInstallment(...candidates: Array<string | undefined>) {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const match = INSTALLMENT_PATTERN.exec(candidate) ?? BARE_INSTALLMENT_PATTERN.exec(candidate);
    if (match) {
      const number = Number(match[1]);
      const total = Number(match[2]);
      if (number >= 1 && total >= 2 && number <= total) return { number, total };
    }
  }
  return null;
}

function stripInstallment(text: string): string {
  return collapseSpaces(
    text
      .replace(/\s*[-–]?\s*(?:parcela|installment)\s*\d+\s*(?:\/|de|of)\s*\d+\s*$/iu, "")
      .replace(/\s*\(?\s*(?:parcela|installment)\s*\d+\s*(?:\/|de|of)\s*\d+\s*\)?/iu, ""),
  );
}

const PAYMENT_PATTERN =
  /^(pagamento (recebido|efetuado|de fatura|da fatura|on line|online|em conta)|pagamento fatura|payment (received|thank you)|pgto)|credito de pagamento|pagamento recebido/u;
const IOF_PATTERN = /\biof\b/u;
const FEE_PATTERN = /\b(anuidade|tarifa|juros|multa|encargos|mora|annual fee|late fee|interest)\b/u;

function classify(description: string, amount: number): StatementLineKind | "payment" {
  const key = normalizeKey(description);
  if (PAYMENT_PATTERN.test(key)) return "payment";
  if (IOF_PATTERN.test(key)) return "iof";
  if (amount < 0) return "credit";
  if (FEE_PATTERN.test(key)) return "fee";
  return "purchase";
}

function buildLine(
  index: number,
  date: string | null,
  rawDescription: string,
  amount: number,
  installment: { number: number; total: number } | null,
): { line: ParsedStatementLine; payment: boolean } {
  const kind = classify(rawDescription, amount);
  const description = stripInstallment(collapseSpaces(rawDescription));
  return {
    payment: kind === "payment",
    line: {
      index,
      date,
      description: description === "" ? collapseSpaces(rawDescription) : description,
      rawDescription,
      amount,
      installment,
      kind: kind === "payment" ? "credit" : kind,
    },
  };
}

/**
 * Pairs each IOF charge with a refund of the same amount and drops both (the issuer bills the tax and gives it back).
 * Unpaired IOF lines stay: they are real charges on the invoice. Pairs are taken in statement order.
 */
export function netIofLines(lines: ParsedStatementLine[]): {
  kept: ParsedStatementLine[];
  netted: ParsedStatementLine[];
} {
  const netted = new Set<number>();
  const iofLines = lines.filter((line) => line.kind === "iof");
  for (const refund of iofLines.filter((line) => line.amount < 0)) {
    const charge = iofLines.find(
      (candidate) =>
        candidate.amount === -refund.amount && !netted.has(candidate.index) && candidate.amount > 0,
    );
    if (charge) {
      netted.add(charge.index);
      netted.add(refund.index);
    }
  }
  return {
    kept: lines.filter((line) => !netted.has(line.index)),
    netted: lines.filter((line) => netted.has(line.index)),
  };
}

function finish(
  issuer: StatementIssuer,
  parsed: Array<{ line: ParsedStatementLine; payment: boolean }>,
  warnings: string[],
  closingBalance: number | null,
): ParsedCardStatement {
  const payments = parsed.filter((item) => item.payment).map((item) => item.line);
  const { kept, netted } = netIofLines(
    parsed.filter((item) => !item.payment).map((item) => item.line),
  );
  const sum = kept.reduce((total, line) => total + line.amount, 0);
  return { issuer, lines: kept, payments, netted, total: closingBalance ?? sum, warnings };
}

function parseTable(text: string, forced?: StatementIssuer): ParsedCardStatement {
  const rows = parseDelimited(text, detectDelimiter(text)).filter((row) =>
    row.some((cell) => cell.trim() !== ""),
  );
  const [headerRow, ...body] = rows;
  if (!headerRow || body.length === 0) {
    throw new StatementParseError("The statement needs a header row and at least one line");
  }
  const keys = headerKeys(headerRow);
  const profile = pickProfile(keys, forced === "ofx" ? undefined : forced);
  if (!profile) {
    throw new StatementParseError(
      "Could not recognize this statement layout. Expected Nubank (date,title,amount), Inter (Data,Lancamento,...,Valor), XP (Data,Estabelecimento,...,Valor) or Inter Global (Date,Description,...,Amount) columns",
    );
  }
  const indexOf = (column: Column) => {
    for (const alias of profile.columns[column]) {
      const found = keys.indexOf(alias);
      if (found >= 0) return found;
    }
    return -1;
  };
  const dateAt = indexOf("date");
  const descriptionAt = indexOf("description");
  const amountAt = indexOf("amount");
  const typeAt = indexOf("type");
  const installmentAt = indexOf("installment");

  const warnings: string[] = [];
  const parsed: Array<{ line: ParsedStatementLine; payment: boolean }> = [];
  body.forEach((row, position) => {
    const rawDescription = collapseSpaces(row[descriptionAt] ?? "");
    const amount = parseStatementAmount(row[amountAt] ?? "");
    const lineNumber = position + 2;
    if (rawDescription === "" && amount === null) return;
    if (amount === null) {
      warnings.push(`Line ${lineNumber}: could not read the amount "${row[amountAt] ?? ""}"`);
      return;
    }
    const rawDate = (row[dateAt] ?? "").trim();
    const date =
      profile.issuer === "inter_global"
        ? (parseUsDate(rawDate) ?? parseDate(rawDate))
        : parseDate(rawDate);
    if (date === null)
      warnings.push(`Line ${lineNumber}: could not read the date "${row[dateAt] ?? ""}"`);
    const installment = readInstallment(
      rawDescription,
      installmentAt >= 0 ? row[installmentAt] : undefined,
      typeAt >= 0 ? row[typeAt] : undefined,
    );
    parsed.push(buildLine(parsed.length, date, rawDescription, amount, installment));
  });
  return finish(profile.issuer, parsed, warnings, null);
}

/** `MM/DD/YYYY`, the layout of the dollar statement. */
function parseUsDate(value: string): string | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/u.exec(value);
  if (!match) return null;
  const [month, day, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  return parseDate(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
}

function parseOfx(name: string, text: string): ParsedCardStatement {
  const adapter = detectParser({ name, text });
  if (!adapter) throw new StatementParseError("Could not read this OFX file");
  const statement = adapter.parse({ name, text });
  const parsed: Array<{ line: ParsedStatementLine; payment: boolean }> = [];
  for (const row of statement.rows) {
    if (row.amount === null || row.problems.length > 0) continue;
    // OFX card rows are signed from the card's point of view (charge negative); statement lines are the opposite.
    const amount = -row.amount;
    const built = buildLine(
      parsed.length,
      row.date,
      row.description,
      amount,
      row.installment ?? null,
    );
    if (row.hints.movement === "card_payment") built.payment = true;
    parsed.push(built);
  }
  const balance = statement.balance ? Math.abs(statement.balance.amount) : null;
  return finish("ofx", parsed, statement.warnings, balance);
}

export type ParseStatementInput = { fileName: string; text: string; issuer?: StatementIssuer };

export function parseCardStatement(input: ParseStatementInput): ParsedCardStatement {
  const text = input.text.replace(/^﻿/u, "");
  const looksLikeOfx =
    /<OFX|OFXHEADER/iu.test(text.slice(0, 2000)) || /\.(ofx|qfx)$/iu.test(input.fileName);
  if (/\.pdf$/iu.test(input.fileName) || text.startsWith("%PDF")) {
    throw new StatementParseError(
      "PDF statements are not supported yet. Export the invoice as CSV or OFX",
    );
  }
  if (input.issuer === "ofx" || (!input.issuer && looksLikeOfx))
    return parseOfx(input.fileName, text);
  return parseTable(text, input.issuer);
}
