import { z } from "zod";

/**
 * The fields an import can fill, defined once here: the API reads files into them and the web
 * wizard lists them in step 2. The user maps file columns to these, never the other way round.
 */
export const importFieldKeySchema = z.enum([
  "date",
  "description",
  "amount",
  "debit",
  "credit",
  "direction",
  "merchant",
  "category",
  "tags",
  "externalId",
  "installment",
]);
export type ImportFieldKey = z.output<typeof importFieldKeySchema>;

export type ImportFieldDefinition = {
  key: ImportFieldKey;
  label: string;
  hint: string;
  /** `always`: needed in every mapping. `amount`: needed unless the amount comes from debit and credit. */
  required: "always" | "amount" | "no";
};

export const IMPORT_FIELDS: readonly ImportFieldDefinition[] = [
  { key: "date", label: "Date", hint: "When the transaction happened", required: "always" },
  {
    key: "description",
    label: "Description",
    hint: "What the bank or file calls it",
    required: "always",
  },
  { key: "amount", label: "Amount", hint: "One column with the value", required: "amount" },
  {
    key: "debit",
    label: "Money out",
    hint: "Instead of Amount: a column with what left the account",
    required: "no",
  },
  {
    key: "credit",
    label: "Money in",
    hint: "Instead of Amount: a column with what came in",
    required: "no",
  },
  {
    key: "direction",
    label: "Type",
    hint: "A column saying whether it is money in or out",
    required: "no",
  },
  { key: "merchant", label: "Merchant", hint: "Who was paid or who paid", required: "no" },
  { key: "category", label: "Category", hint: "The file's own category", required: "no" },
  { key: "tags", label: "Tags", hint: "One or more labels, separated by commas", required: "no" },
  {
    key: "installment",
    label: "Installment",
    hint: "Which installment this is, like 4/12 (credit cards)",
    required: "no",
  },
  {
    key: "externalId",
    label: "Reference ID",
    hint: "A unique id from the bank; makes duplicates certain",
    required: "no",
  },
];

export const IMPORT_DATE_FORMATS = [
  { value: "YYYY-MM-DD", label: "2026-10-28" },
  { value: "MM/DD/YYYY", label: "10/28/2026" },
  { value: "DD/MM/YYYY", label: "28/10/2026" },
  { value: "MM-DD-YYYY", label: "10-28-2026" },
  { value: "DD-MM-YYYY", label: "28-10-2026" },
  { value: "DD.MM.YYYY", label: "28.10.2026" },
  { value: "YYYY/MM/DD", label: "2026/10/28" },
] as const;
export const importDateFormatSchema = z.enum([
  "YYYY-MM-DD",
  "MM/DD/YYYY",
  "DD/MM/YYYY",
  "MM-DD-YYYY",
  "DD-MM-YYYY",
  "DD.MM.YYYY",
  "YYYY/MM/DD",
]);

export const IMPORT_NUMBER_FORMATS = [
  { value: ".", label: "1,234.56" },
  { value: ",", label: "1.234,56" },
] as const;

export const importColumnMappingSchema = z.object({
  /** Field -> the file's column header. A field that is absent is not imported. */
  columns: z.partialRecord(importFieldKeySchema, z.string().min(1).max(255)),
  dateFormat: importDateFormatSchema,
  /** The decimal separator of the amount columns. */
  decimalSeparator: z.enum([".", ","]),
  /** Single amount column only: does a negative number mean money out (usual for banks) or in? */
  amountSign: z.enum(["negative_is_out", "positive_is_out"]).default("negative_is_out"),
  /** Values of the Type column that mean money out; every other value means money in. */
  outflowValues: z.array(z.string().max(64)).max(30).default([]),
  /** Read "Parcela 4/12" or "4/12" at the end of the description when there is no Installment column. */
  installmentsFromDescription: z.boolean().default(false),
});
export type ImportColumnMapping = z.output<typeof importColumnMappingSchema>;

/** The fields still missing from a mapping, in English, empty when the mapping is complete. */
export function missingImportFields(mapping: Pick<ImportColumnMapping, "columns">): string[] {
  const { columns } = mapping;
  const missing: string[] = [];
  if (!columns.date) missing.push("Date");
  if (!columns.description) missing.push("Description");
  if (!columns.amount && !(columns.debit || columns.credit)) missing.push("Amount");
  return missing;
}

export const importFilePreviewSchema = z.object({
  headers: z.array(z.string()),
  /** The first rows of the file exactly as written. */
  rows: z.array(z.array(z.string())),
  totalRows: z.number().int(),
  /** Headers whose column has few distinct values, with those values (used to pick money-out values). */
  columnValues: z.record(z.string(), z.array(z.string())),
  /** Pre-filled mapping: the one already confirmed, else the saved template when the layout matches, else header aliases. */
  suggestion: importColumnMappingSchema.nullable(),
  suggestionSource: z.enum(["current", "template", "aliases"]).nullable(),
});
export type ImportFilePreview = z.output<typeof importFilePreviewSchema>;
