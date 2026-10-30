import {
  IMPORT_DATE_FORMATS,
  type ImportColumnMapping,
  type ImportFieldKey,
} from "@luraba/contracts/imports";
import type { RawTable } from "./imports.table";
import { collapseSpaces, normalizeKey, parseAmount } from "./parsers/text";
import type { ParsedRow } from "./parsers/types";

type DateFormat = ImportColumnMapping["dateFormat"];

/**
 * Header words (accent-free, lowercase) that suggest a field. Portuguese and English, plus common
 * synonyms. These only pre-fill step 2; the user can change every one of them.
 */
const ALIASES: Record<ImportFieldKey, readonly string[]> = {
  date: [
    "date",
    "data",
    "posted date",
    "transaction date",
    "data da transacao",
    "data lancamento",
    "data movimentacao",
    "dt",
    "dia",
  ],
  description: [
    "description",
    "descricao",
    "desc",
    "details",
    "detalhes",
    "memo",
    "historico",
    "title",
    "titulo",
    "lancamento",
    "name",
    "nome",
    "narrative",
  ],
  amount: ["amount", "valor", "value", "total", "quantia", "montante", "valor rs", "valor r"],
  debit: ["debit", "debito", "saida", "saidas", "money out", "withdrawal", "retirada"],
  credit: ["credit", "credito", "entrada", "entradas", "money in", "deposit", "deposito"],
  direction: [
    "type",
    "tipo",
    "transaction type",
    "tipo de transacao",
    "tipo lancamento",
    "direction",
    "natureza",
    "debito credito",
    "dc",
  ],
  merchant: [
    "merchant",
    "estabelecimento",
    "payee",
    "favorecido",
    "beneficiario",
    "counterparty",
    "loja",
    "banco",
    "bank",
    "store",
  ],
  category: ["category", "categoria", "grupo", "group"],
  tags: ["tags", "tag", "labels", "etiquetas", "marcadores"],
  installment: ["installment", "installments", "parcela", "parcelas", "parc", "parcelamento"],
  externalId: [
    "id",
    "identificador",
    "reference",
    "referencia",
    "ref",
    "transaction id",
    "id da transacao",
    "fitid",
    "codigo",
    "documento",
  ],
};

const OUTFLOW_WORDS = new Set([
  "debit",
  "debito",
  "d",
  "saida",
  "despesa",
  "expense",
  "out",
  "withdrawal",
  "saque",
  "pagamento",
  "payment",
  "compra",
  "purchase",
  "sale",
]);

const FIELD_ORDER: readonly ImportFieldKey[] = [
  "date",
  "amount",
  "debit",
  "credit",
  "direction",
  "externalId",
  "installment",
  "category",
  "tags",
  "merchant",
  "description",
];

/** First header that matches the field's aliases: exact words first, then headers containing one. */
function matchHeader(
  field: ImportFieldKey,
  normalized: ReadonlyMap<string, string>,
  used: ReadonlySet<string>,
): string | undefined {
  const aliases = ALIASES[field];
  for (const alias of aliases) {
    for (const [header, key] of normalized) {
      if (!used.has(header) && key === alias) return header;
    }
  }
  for (const alias of aliases) {
    if (alias.length < 4) continue;
    for (const [header, key] of normalized) {
      if (!used.has(header) && key.split(" ").includes(alias)) return header;
    }
  }
  return undefined;
}

const DATE_PATTERNS: Array<[DateFormat, RegExp]> = [
  ["YYYY-MM-DD", /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/u],
  ["YYYY/MM/DD", /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/u],
  ["MM/DD/YYYY", /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/u],
  ["DD/MM/YYYY", /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/u],
  ["MM-DD-YYYY", /^(\d{1,2})-(\d{1,2})-(\d{4})$/u],
  ["DD-MM-YYYY", /^(\d{1,2})-(\d{1,2})-(\d{4})$/u],
  ["DD.MM.YYYY", /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/u],
];

/** Reads a date written in the chosen format into `YYYY-MM-DD`; null when it does not fit. */
export function parseDateWith(value: string, format: DateFormat): string | null {
  const text = value.trim();
  const pattern = DATE_PATTERNS.find(([candidate]) => candidate === format)?.[1];
  const match = pattern?.exec(text);
  if (!match) return null;
  const [a, b, c] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const [year, month, day] = format.startsWith("YYYY")
    ? [a, b, c]
    : format.startsWith("MM")
      ? [c, a, b]
      : [c, b, a];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** The format that reads the most sample dates; day-first wins a tie (nothing says month-first). */
export function suggestDateFormat(samples: readonly string[]): DateFormat {
  const preference = IMPORT_DATE_FORMATS.map((format) => format.value).sort((a, b) =>
    a === "DD/MM/YYYY" ? -1 : b === "DD/MM/YYYY" ? 1 : 0,
  );
  let best: { format: DateFormat; hits: number } = { format: "YYYY-MM-DD", hits: -1 };
  for (const format of preference) {
    const hits = samples.filter((sample) => parseDateWith(sample, format) !== null).length;
    if (hits > best.hits) best = { format, hits };
  }
  return best.format;
}

/** `,` when the samples look like 1.234,56; otherwise `.`. */
export function suggestDecimalSeparator(samples: readonly string[]): "." | "," {
  let comma = 0;
  let dot = 0;
  for (const sample of samples) {
    const text = sample.replace(/[^\d.,]/gu, "");
    const lastComma = text.lastIndexOf(",");
    const lastDot = text.lastIndexOf(".");
    if (lastComma > lastDot) comma += 1;
    else if (lastDot > lastComma) dot += 1;
  }
  return comma > dot ? "," : ".";
}

function columnSamples(table: RawTable, header: string | undefined, limit = 50): string[] {
  const index = header ? table.headers.indexOf(header) : -1;
  if (index < 0) return [];
  return table.rows
    .slice(0, limit)
    .map((row) => row[index] ?? "")
    .filter((cell) => cell !== "");
}

export function distinctValues(table: RawTable, header: string, limit: number): string[] | null {
  const index = table.headers.indexOf(header);
  const values = new Set<string>();
  for (const row of table.rows) {
    const cell = row[index] ?? "";
    if (cell !== "") values.add(cell);
    if (values.size > limit) return null;
  }
  return [...values].sort((a, b) => a.localeCompare(b));
}

export function headerSignature(headers: readonly string[]): string {
  return headers.map((header) => normalizeKey(header)).join("|");
}

function mostlyPositive(samples: readonly string[]): boolean {
  const negative = samples.filter((sample) => sample.trim().startsWith("-")).length;
  return samples.length > 0 && negative / samples.length < 0.5;
}

/** A first guess for step 2, from the header names and a few sample values. Never final. */
export function suggestMapping(
  table: RawTable,
  options: { creditCard?: boolean } = {},
): ImportColumnMapping {
  const normalized = new Map(table.headers.map((header) => [header, normalizeKey(header)]));
  const columns: ImportColumnMapping["columns"] = {};
  const used = new Set<string>();
  for (const field of FIELD_ORDER) {
    const header = matchHeader(field, normalized, used);
    if (header) {
      columns[field] = header;
      used.add(header);
    }
  }
  // One amount column is simpler than debit/credit: keep the pair only when there is no amount.
  if (columns.amount) {
    delete columns.debit;
    delete columns.credit;
  }
  const amountSamples = [
    ...columnSamples(table, columns.amount),
    ...columnSamples(table, columns.debit),
    ...columnSamples(table, columns.credit),
  ];
  const outflowValues = columns.direction
    ? (distinctValues(table, columns.direction, 30) ?? []).filter((value) =>
        OUTFLOW_WORDS.has(normalizeKey(value)),
      )
    : [];
  return {
    columns,
    dateFormat: suggestDateFormat(columnSamples(table, columns.date)),
    decimalSeparator: suggestDecimalSeparator(amountSamples),
    // Card exports list charges as positive numbers and payments as negative ones.
    amountSign:
      options.creditCard && columns.amount && mostlyPositive(columnSamples(table, columns.amount))
        ? "positive_is_out"
        : "negative_is_out",
    outflowValues,
    // Reading numbers out of free text is never switched on for the user.
    installmentsFromDescription: false,
  };
}

/** Header names that no longer exist in the file (a template from another layout, an edited request). */
export function unknownHeaders(table: RawTable, mapping: ImportColumnMapping): string[] {
  return Object.values(mapping.columns).filter((header) => !table.headers.includes(header));
}

const INSTALLMENT_PART = /(\d{1,3})\s*(?:\/|de|of)\s*(\d{1,3})/iu;
const INSTALLMENT_SUFFIX =
  /\s*[-–]?\s*(?:parcela|parc\.?|installment)?\s*(\d{1,3})\s*(?:\/|de|of)\s*(\d{1,3})\s*$/iu;

function installmentOf(
  number: string | undefined,
  total: string | undefined,
): { number: number; total: number } | null {
  const n = Number(number);
  const t = Number(total);
  return Number.isInteger(n) && Number.isInteger(t) && t > 1 && n >= 1 && n <= t
    ? { number: n, total: t }
    : null;
}

/** "Terabyteshop - Parcela 4/12" -> installment 4 of 12, plan name "Terabyteshop". */
export function readInstallmentFromDescription(description: string): {
  installment: { number: number; total: number };
  base: string;
} | null {
  const match = INSTALLMENT_SUFFIX.exec(description);
  const installment = installmentOf(match?.[1], match?.[2]);
  if (!match || !installment) return null;
  return { installment, base: description.slice(0, match.index).trim() };
}

const TAG_SPLIT = /[,;|]/u;

/**
 * Reads every data row through the mapping. A row that cannot be read keeps its place with
 * `problems` (short messages), so the user decides in review instead of rows vanishing.
 */
export function applyMapping(table: RawTable, mapping: ImportColumnMapping): ParsedRow[] {
  const at = (field: ImportFieldKey): number => {
    const header = mapping.columns[field];
    return header ? table.headers.indexOf(header) : -1;
  };
  const index = {
    date: at("date"),
    description: at("description"),
    amount: at("amount"),
    debit: at("debit"),
    credit: at("credit"),
    direction: at("direction"),
    merchant: at("merchant"),
    category: at("category"),
    tags: at("tags"),
    externalId: at("externalId"),
    installment: at("installment"),
  };
  const outflow = new Set(mapping.outflowValues.map((value) => normalizeKey(value)));

  return table.rows.map((cells) => {
    const get = (position: number) => (position >= 0 ? (cells[position] ?? "").trim() : "");
    const problems: string[] = [];

    const dateText = get(index.date);
    const date = dateText ? parseDateWith(dateText, mapping.dateFormat) : null;
    if (!date) problems.push(dateText ? `Bad date: "${dateText}"` : "Date is empty");

    let amount: number | null = null;
    if (index.amount >= 0) {
      const text = get(index.amount);
      const value = parseAmount(text, mapping.decimalSeparator);
      if (value === null) problems.push(text ? `Bad amount: "${text}"` : "Amount is empty");
      else if (index.direction >= 0) {
        const out = outflow.has(normalizeKey(get(index.direction)));
        amount = out ? -Math.abs(value) : Math.abs(value);
      } else amount = mapping.amountSign === "positive_is_out" ? -value : value;
    } else {
      const out = parseAmount(get(index.debit), mapping.decimalSeparator);
      const incoming = parseAmount(get(index.credit), mapping.decimalSeparator);
      const badDebit = get(index.debit) !== "" && out === null;
      const badCredit = get(index.credit) !== "" && incoming === null;
      if (badDebit || badCredit)
        problems.push(`Bad amount: "${badDebit ? get(index.debit) : get(index.credit)}"`);
      else if (out === null && incoming === null) problems.push("Amount is empty");
      else amount = Math.abs(incoming ?? 0) - Math.abs(out ?? 0);
    }

    const description = collapseSpaces(get(index.description));
    if (!description) problems.push("Description is empty");
    const merchant = collapseSpaces(get(index.merchant));
    const category = collapseSpaces(get(index.category));
    const tagValues = get(index.tags)
      .split(TAG_SPLIT)
      .map((tag) => collapseSpaces(tag))
      .filter(Boolean);

    let installment: { number: number; total: number } | null = null;
    let seriesBase: string | null = null;
    if (index.installment >= 0) {
      const text = get(index.installment);
      const match = INSTALLMENT_PART.exec(text);
      installment = installmentOf(match?.[1], match?.[2]);
      if (text && !installment) problems.push(`Bad installment: "${text}"`);
      else if (installment) seriesBase = description;
    } else if (mapping.installmentsFromDescription) {
      const read = readInstallmentFromDescription(description);
      if (read) {
        installment = read.installment;
        seriesBase = read.base;
      }
    }

    return {
      date,
      amount,
      installment,
      seriesBase,
      description: description || "(no description)",
      counterparty: merchant || null,
      externalId: get(index.externalId) || null,
      hints: {
        ...(category ? { categoryValue: category } : {}),
        ...(tagValues.length ? { tagValues } : {}),
      },
      raw: Object.fromEntries(table.headers.map((header, i) => [header, cells[i] ?? ""])),
      problems,
    };
  });
}
