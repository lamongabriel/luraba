import { normalizeKey, parseDate, parseDelimited } from "@/modules/imports/parsers/text";

/** One event as read from a file, before the symbol is matched to an asset. */
export type ParsedEvent = {
  type: string;
  tradeDate: string;
  symbol: string | null;
  quantity: string | null;
  unitPrice: string | null;
  grossAmount: string;
  fees: string;
  taxesWithheld: string;
  currencyCode: string;
  notes: string | null;
  externalId: string | null;
  meta?: Record<string, unknown>;
};

export type ParsedRow = {
  row: number;
  status: "ok" | "error" | "unsupported";
  message: string | null;
  event: ParsedEvent | null;
  raw: string | null;
  /** Kind of record that is not supported (reported once in the summary). */
  unsupportedType?: string;
};

export type Table = { headers: string[]; rows: string[][] };

/** Reads decimals written as `1.234,56`, `1,234.56`, `12,5`, `0.25` or `R$ 10,00`. */
export function parseDecimal(input: string | number | null | undefined): string | null {
  if (input === null || input === undefined) return null;
  let text = String(input).replace(/R\$|US\$|\$|\s/gu, "");
  if (text === "" || text === "-") return null;
  let negative = false;
  if (/^\(.*\)$/u.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }
  if (text.startsWith("-")) {
    negative = !negative;
    text = text.slice(1);
  }
  const comma = text.lastIndexOf(",");
  const dot = text.lastIndexOf(".");
  let normalized: string;
  if (comma >= 0 && dot >= 0) {
    normalized =
      comma > dot ? text.replaceAll(".", "").replace(",", ".") : text.replaceAll(",", "");
  } else if (comma >= 0) {
    normalized = text.split(",").length > 2 ? text.replaceAll(",", "") : text.replace(",", ".");
  } else if (dot >= 0 && text.split(".").length > 2) {
    normalized = text.replaceAll(".", "");
  } else {
    normalized = text;
  }
  if (!/^\d*\.?\d+$|^\d+\.$/u.test(normalized)) return null;
  const clean = normalized.replace(/\.$/u, "");
  return negative && clean !== "0" ? `-${clean}` : clean;
}

function detectDelimiter(text: string): string {
  const head = text.split(/\r?\n/u).find((line) => line.trim() !== "") ?? "";
  const counts = [";", ",", "\t"].map((d) => [d, head.split(d).length] as const);
  return counts.sort((a, b) => b[1] - a[1])[0]?.[0] ?? ",";
}

export function parseCsvTable(text: string): Table {
  const rows = parseDelimited(text.replace(/^﻿/u, ""), detectDelimiter(text));
  const [headers = [], ...body] = rows;
  return { headers: headers.map((h) => h.trim()), rows: body };
}

function columnIndex(headers: string[]) {
  const keys = headers.map(normalizeKey);
  return (...names: string[]): number => {
    for (const name of names) {
      const i = keys.indexOf(normalizeKey(name));
      if (i >= 0) return i;
    }
    return -1;
  };
}

const rawOf = (cells: string[]): string => cells.join(" | ").slice(0, 300);

function error(row: number, message: string, cells: string[]): ParsedRow {
  return { row, status: "error", message, event: null, raw: rawOf(cells) };
}

// ---------------------------------------------------------------- type aliases

const TYPE_ALIASES: Record<string, string> = {
  buy: "BUY",
  compra: "BUY",
  c: "BUY",
  purchase: "BUY",
  sell: "SELL",
  venda: "SELL",
  v: "SELL",
  sale: "SELL",
  dividend: "DIVIDEND",
  dividendo: "DIVIDEND",
  dividendos: "DIVIDEND",
  jcp: "JCP",
  "juros sobre capital proprio": "JCP",
  "interest on equity": "JCP",
  "fii income": "FII_INCOME",
  rendimento: "FII_INCOME",
  rendimentos: "FII_INCOME",
  coupon: "COUPON",
  cupom: "COUPON",
  deposit: "DEPOSIT",
  deposito: "DEPOSIT",
  withdrawal: "WITHDRAWAL",
  saque: "WITHDRAWAL",
  retirada: "WITHDRAWAL",
  fee: "FEE",
  tarifa: "FEE",
  taxa: "FEE",
  split: "SPLIT",
  "reverse split": "REVERSE_SPLIT",
  bonus: "BONUS_SHARES",
  bonificacao: "BONUS_SHARES",
  interest: "INTEREST_ON_CASH",
};

export function resolveType(value: string): string | null {
  const key = normalizeKey(value);
  const upper = value.trim().toUpperCase().replaceAll(" ", "_");
  return TYPE_ALIASES[key] ?? (INVESTMENT_TYPES.has(upper) ? upper : null);
}

const INVESTMENT_TYPES = new Set([
  "DEPOSIT",
  "WITHDRAWAL",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "FX_CONVERSION",
  "FEE",
  "TAX_PAYMENT",
  "INTEREST_ON_CASH",
  "BUY",
  "SELL",
  "SUBSCRIPTION",
  "DIVIDEND",
  "JCP",
  "FII_INCOME",
  "COUPON",
  "BOND_INTEREST",
  "AMORTIZATION",
  "RETURN_OF_CAPITAL",
  "SPLIT",
  "REVERSE_SPLIT",
  "BONUS_SHARES",
  "SUBSCRIPTION_RIGHT_RECEIVED",
  "SPIN_OFF",
  "MERGER",
  "TICKER_CHANGE",
  "DELISTING",
  "FI_APPLICATION",
  "FI_REDEMPTION",
  "FI_MATURITY",
]);

const CASH_ONLY = new Set([
  "DEPOSIT",
  "WITHDRAWAL",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "FEE",
  "TAX_PAYMENT",
  "INTEREST_ON_CASH",
]);

function finish(
  row: number,
  cells: string[],
  e: Omit<Partial<ParsedEvent>, "grossAmount"> & {
    type: string;
    tradeDate: string;
    grossAmount?: string | null;
  },
): ParsedRow {
  const quantity = e.quantity ?? null;
  const unitPrice = e.unitPrice ?? null;
  let gross = e.grossAmount ?? null;
  if (gross === null && quantity && unitPrice) gross = String(Number(quantity) * Number(unitPrice));
  if (gross === null) gross = "0";
  const needsAsset = !CASH_ONLY.has(e.type);
  if (needsAsset && !e.symbol) return error(row, "Missing asset code", cells);
  if ((e.type === "BUY" || e.type === "SELL") && (!quantity || Number(quantity) <= 0)) {
    return error(row, "Missing quantity", cells);
  }
  if (CASH_ONLY.has(e.type) && Number(gross) <= 0) return error(row, "Missing amount", cells);
  return {
    row,
    status: "ok",
    message: null,
    raw: rawOf(cells),
    event: {
      type: e.type,
      tradeDate: e.tradeDate,
      symbol: e.symbol ? e.symbol.toUpperCase() : null,
      quantity,
      unitPrice,
      grossAmount: gross.replace(/^-/u, ""),
      fees: e.fees ?? "0",
      taxesWithheld: e.taxesWithheld ?? "0",
      currencyCode: e.currencyCode ?? "BRL",
      notes: e.notes ?? null,
      externalId: e.externalId ?? null,
      meta: e.meta,
    },
  };
}

// ---------------------------------------------------------------- app CSV

export const APP_CSV_COLUMNS = [
  "date",
  "type",
  "symbol",
  "quantity",
  "unit_price",
  "gross_amount",
  "fees",
  "taxes_withheld",
  "currency",
  "notes",
  "external_id",
] as const;

export const APP_CSV_TEMPLATE = `${APP_CSV_COLUMNS.join(",")}\r\n2026-01-05,BUY,AAPL,10,150.25,,1.00,,USD,First purchase,\r\n2026-02-10,DIVIDEND,AAPL,,,2.40,,0.72,USD,,\r\n2026-03-01,DEPOSIT,,,,1000,,,USD,Funding,\r\n`;

export function parseAppCsv(table: Table, defaultCurrency: string): ParsedRow[] {
  const col = columnIndex(table.headers);
  const idx = Object.fromEntries(APP_CSV_COLUMNS.map((c) => [c, col(c)])) as Record<
    (typeof APP_CSV_COLUMNS)[number],
    number
  >;
  return table.rows.map((cells, i) => {
    const row = i + 2;
    const get = (k: (typeof APP_CSV_COLUMNS)[number]) =>
      idx[k] >= 0 ? (cells[idx[k]] ?? "").trim() : "";
    const date = parseDate(get("date"));
    if (!date) return error(row, "Invalid date", cells);
    const type = resolveType(get("type"));
    if (!type) return error(row, `Unknown type "${get("type")}"`, cells);
    return finish(row, cells, {
      type,
      tradeDate: date,
      symbol: get("symbol") || null,
      quantity: parseDecimal(get("quantity")),
      unitPrice: parseDecimal(get("unit_price")),
      grossAmount: parseDecimal(get("gross_amount")),
      fees: parseDecimal(get("fees")) ?? "0",
      taxesWithheld: parseDecimal(get("taxes_withheld")) ?? "0",
      currencyCode: (get("currency") || defaultCurrency).toUpperCase(),
      notes: get("notes") || null,
      externalId: get("external_id") || null,
    });
  });
}

// ---------------------------------------------------------------- generic CSV with mapping

export const GENERIC_FIELDS = [
  "date",
  "type",
  "symbol",
  "quantity",
  "unitPrice",
  "grossAmount",
  "fees",
  "taxesWithheld",
  "currency",
  "notes",
  "externalId",
] as const;
export type GenericField = (typeof GENERIC_FIELDS)[number];

export function parseGenericCsv(
  table: Table,
  mapping: Record<string, string>,
  defaultCurrency: string,
): ParsedRow[] {
  const col = columnIndex(table.headers);
  const at = (f: GenericField) => (mapping[f] ? col(mapping[f] as string) : -1);
  const idx = Object.fromEntries(GENERIC_FIELDS.map((f) => [f, at(f)])) as Record<
    GenericField,
    number
  >;
  return table.rows.map((cells, i) => {
    const row = i + 2;
    const get = (f: GenericField) => (idx[f] >= 0 ? (cells[idx[f]] ?? "").trim() : "");
    const date = parseDate(get("date"));
    if (!date) return error(row, "Invalid date", cells);
    const typeText = get("type");
    const type = typeText ? resolveType(typeText) : null;
    if (!type) return error(row, `Unknown type "${typeText}"`, cells);
    return finish(row, cells, {
      type,
      tradeDate: date,
      symbol: get("symbol") || null,
      quantity: parseDecimal(get("quantity")),
      unitPrice: parseDecimal(get("unitPrice")),
      grossAmount: parseDecimal(get("grossAmount")),
      fees: parseDecimal(get("fees")) ?? "0",
      taxesWithheld: parseDecimal(get("taxesWithheld")) ?? "0",
      currencyCode: (get("currency") || defaultCurrency).toUpperCase(),
      notes: get("notes") || null,
      externalId: get("externalId") || null,
    });
  });
}

// ---------------------------------------------------------------- B3 Negociação

/** B3 marks the fractional market with a trailing F (PETR4F). */
export function b3Symbol(code: string, market: string): string {
  const upper = code.trim().toUpperCase();
  return /fracion/iu.test(normalizeKey(market)) || /^[A-Z]{4}\d{1,2}F$/u.test(upper)
    ? upper.replace(/F$/u, "")
    : upper;
}

export function parseB3Negociacao(table: Table): ParsedRow[] {
  const col = columnIndex(table.headers);
  const iDate = col("Data do Negócio", "Data do Negocio");
  const iKind = col("Tipo de Movimentação", "Tipo de Movimentacao");
  const iMarket = col("Mercado");
  const iCode = col("Código de Negociação", "Codigo de Negociacao");
  const iQty = col("Quantidade");
  const iPrice = col("Preço", "Preco");
  const iValue = col("Valor");
  if ([iDate, iKind, iCode, iQty, iPrice].some((i) => i < 0)) {
    return [
      error(1, "This does not look like a B3 Negociação file (missing columns)", table.headers),
    ];
  }
  return table.rows.map((cells, i) => {
    const row = i + 2;
    const date = parseDate(cells[iDate]);
    if (!date) return error(row, "Invalid date", cells);
    const kind = normalizeKey(cells[iKind] ?? "");
    const type = kind.startsWith("compra") ? "BUY" : kind.startsWith("venda") ? "SELL" : null;
    if (!type) return error(row, `Unknown movement "${cells[iKind]}"`, cells);
    return finish(row, cells, {
      type,
      tradeDate: date,
      symbol: b3Symbol(cells[iCode] ?? "", iMarket >= 0 ? (cells[iMarket] ?? "") : ""),
      quantity: parseDecimal(cells[iQty]),
      unitPrice: parseDecimal(cells[iPrice]),
      grossAmount: iValue >= 0 ? parseDecimal(cells[iValue]) : null,
      currencyCode: "BRL",
    });
  });
}

// ---------------------------------------------------------------- B3 Movimentação

const MOVEMENT_MAP: [RegExp, string | "skip" | "manual"][] = [
  [/^juros sobre capital proprio/u, "JCP"],
  [/^dividendo/u, "DIVIDEND"],
  [/^rendimento/u, "FII_INCOME"],
  [/^transferencia - liquidacao/u, "skip"],
  [
    /^desdobro|^grupamento|^bonificacao|^fracao em ativos|^leilao de fracao|^cessao de direitos|^direito/u,
    "manual",
  ],
];

export function parseB3Movimentacao(table: Table): ParsedRow[] {
  const col = columnIndex(table.headers);
  const iDate = col("Data");
  const iMove = col("Movimentação", "Movimentacao");
  const iProduct = col("Produto");
  const iValue = col("Valor da Operação", "Valor da Operacao");
  if ([iDate, iMove, iProduct].some((i) => i < 0)) {
    return [
      error(1, "This does not look like a B3 Movimentação file (missing columns)", table.headers),
    ];
  }
  return table.rows.map((cells, i) => {
    const row = i + 2;
    const date = parseDate(cells[iDate]);
    if (!date) return error(row, "Invalid date", cells);
    const movement = normalizeKey(cells[iMove] ?? "");
    const rule = MOVEMENT_MAP.find(([pattern]) => pattern.test(movement));
    const label = (cells[iMove] ?? "").trim();
    if (!rule || rule[1] === "skip") {
      return {
        row,
        status: "unsupported",
        message: rule
          ? "Trades are imported from the Negociação file"
          : "Movement type not supported",
        event: null,
        raw: rawOf(cells),
        unsupportedType: label,
      };
    }
    if (rule[1] === "manual") {
      return {
        row,
        status: "unsupported",
        message: "Corporate actions need their ratio: add them manually",
        event: null,
        raw: rawOf(cells),
        unsupportedType: label,
      };
    }
    const symbol = (cells[iProduct] ?? "").split(" - ")[0]?.trim() ?? "";
    return finish(row, cells, {
      type: rule[1],
      tradeDate: date,
      symbol: b3Symbol(symbol, ""),
      grossAmount: iValue >= 0 ? parseDecimal(cells[iValue]) : null,
      quantity: null,
      currencyCode: "BRL",
      notes: "B3 reports the credited amount",
    });
  });
}

// ---------------------------------------------------------------- JSON backup

export function parseJsonBackup(text: string): ParsedRow[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return [error(1, "Invalid JSON", [])];
  }
  const events = Array.isArray(data) ? data : (data as { events?: unknown }).events;
  if (!Array.isArray(events)) return [error(1, "No events found in the backup", [])];
  return events.map((raw, i) => {
    const row = i + 1;
    const r = raw as Record<string, unknown>;
    const date = parseDate(String(r.tradeDate ?? r.date ?? ""));
    const type = resolveType(String(r.type ?? ""));
    if (!date || !type) return error(row, "Invalid event", [JSON.stringify(raw)]);
    const dec = (v: unknown) =>
      v === null || v === undefined || v === "" ? null : parseDecimal(String(v));
    return finish(row, [JSON.stringify(raw)], {
      type,
      tradeDate: date,
      symbol: r.symbol ? String(r.symbol) : r.assetSymbol ? String(r.assetSymbol) : null,
      quantity: dec(r.quantity),
      unitPrice: dec(r.unitPrice),
      grossAmount: dec(r.grossAmount),
      fees: dec(r.fees) ?? "0",
      taxesWithheld: dec(r.taxesWithheld) ?? "0",
      currencyCode: String(r.currencyCode ?? "BRL").toUpperCase(),
      notes: r.notes ? String(r.notes) : null,
      externalId: r.externalId ? String(r.externalId) : r.id ? String(r.id) : null,
      meta: (r.meta as Record<string, unknown>) ?? undefined,
    });
  });
}
