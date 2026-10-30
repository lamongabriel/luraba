/**
 * The normalized shape every format adapter produces. Anything bank- or format-specific stays
 * inside the adapter; the staging, mapping and importer layers only see these types.
 */
export type ImportSourceKind = "bank_account" | "credit_card";

/** What an adapter believes a row is, independent of the Luraba account it will land in. */
export type RowMovement = "investment" | "card_payment" | "card_refund";

export type RowHints = {
  movement?: RowMovement;
  /** Luraba payment method code ("pix", "boleto"...). Used when available for the currency. */
  paymentMethod?: string;
  /** The file's own category text (table imports), mapped to a Luraba category in step 3. */
  categoryValue?: string;
  /** The file's own tag texts (table imports), each mapped to a Luraba tag in step 3. */
  tagValues?: string[];
};

export type ParsedRow = {
  /** `YYYY-MM-DD`, or null when the file's date could not be read (the row becomes invalid). */
  date: string | null;
  /** Signed minor units from the account's point of view: negative = money out / card charge. */
  amount: number | null;
  /** The raw description as the bank wrote it; shown as data, never translated. */
  description: string;
  /** Who the money went to or came from, when the file says. Drives merchant mapping. */
  counterparty?: string | null;
  /** The bank's own id (OFX FITID, Nubank `Identificador`). */
  externalId?: string | null;
  installment?: { number: number; total: number } | null;
  /** Description without the installment suffix: identifies one installment plan. */
  seriesBase?: string | null;
  balanceAfter?: number | null;
  hints: RowHints;
  raw: Record<string, string>;
  /** Parse problems (bad date, bad amount...). Any entry makes the row invalid. */
  problems: string[];
};

export type ParsedStatement = {
  sourceKind: ImportSourceKind;
  institution: string | null;
  /** Account / card identifier as written in the file. */
  accountRef: string | null;
  currency: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  /**
   * Closing balance in the target's own view: for a bank account the balance; for a credit card the
   * amount owed (positive).
   */
  balance: { amount: number; date: string | null } | null;
  rows: ParsedRow[];
  warnings: string[];
};

export type ImportFile = { name: string; text: string };

export interface ParserAdapter {
  id: string;
  label: string;
  description: string;
  /** Null when the adapter decides from the content (generic OFX). */
  sourceKind: ImportSourceKind | null;
  extensions: string[];
  /** 0 = not this format, 1 = certain. The highest score wins; below 0.3 nothing matches. */
  detect(file: ImportFile): number;
  parse(file: ImportFile): ParsedStatement;
}

/** Bank-specific reading of descriptions. Matched by adapters, never by the core. */
export type InterpretedRow = {
  description: string;
  counterparty: string | null;
  hints: RowHints;
  installment?: { number: number; total: number } | null;
  seriesBase?: string | null;
};

export interface BankProfile {
  id: string;
  label: string;
  /** Does the OFX financial institution header belong to this bank? */
  matchesOfx(institution: { org?: string; fid?: string; bankId?: string }): boolean;
  interpret(input: {
    sourceKind: ImportSourceKind;
    /** Main text (OFX MEMO, CSV description). */
    text: string;
    /** Secondary text (OFX NAME, CSV "history" column), when the file has one. */
    secondary?: string | null;
    amount: number | null;
  }): InterpretedRow;
}
