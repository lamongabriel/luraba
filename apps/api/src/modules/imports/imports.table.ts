import { readSheet } from "read-excel-file/node";
import { ValidationError } from "@/shared/errors";
import { decodeFileBytes, parseDelimited } from "./parsers/text";

/** A file read as plain text cells: the header row and the data rows. Nothing is interpreted yet. */
export type RawTable = { headers: string[]; rows: string[][] };

const DELIMITERS = [",", ";", "\t", "|"] as const;
const MAX_COLUMNS = 60;

export type TableKind = "csv" | "xlsx" | "ofx";

export function tableKindOf(fileName: string): TableKind | null {
  const extension = /\.([a-z0-9]+)$/iu.exec(fileName)?.[1]?.toLowerCase();
  if (extension === "csv" || extension === "tsv" || extension === "txt") return "csv";
  if (extension === "xlsx") return "xlsx";
  if (extension === "ofx" || extension === "qfx") return "ofx";
  return null;
}

/** The delimiter that splits the first lines into the most (and a consistent number of) columns. */
function detectDelimiter(text: string): string {
  const lines = text
    .split(/\r?\n/u)
    .filter((line) => line.trim() !== "")
    .slice(0, 10);
  let best: { delimiter: string; score: number } = { delimiter: ",", score: 0 };
  for (const delimiter of DELIMITERS) {
    const counts = lines.map((line) => parseDelimited(line, delimiter)[0]?.length ?? 0);
    const first = counts[0] ?? 0;
    if (first < 2) continue;
    const consistent = counts.filter((count) => count === first).length;
    const score = consistent * 100 + first;
    if (score > best.score) best = { delimiter, score };
  }
  return best.delimiter;
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).replace(/\s+/gu, " ").trim();
}

/** Turns raw cell rows into a table: unique, non-empty headers and rows padded to the header width. */
export function buildTable(cells: string[][]): RawTable {
  const [headerRow, ...body] = cells;
  if (!headerRow || body.length === 0)
    throw new ValidationError("The file needs a header row and at least one data row");
  const width = Math.min(MAX_COLUMNS, Math.max(headerRow.length, ...body.map((row) => row.length)));
  const seen = new Map<string, number>();
  const headers = Array.from({ length: width }, (_, index) => {
    const base = (headerRow[index] ?? "").trim() || `Column ${index + 1}`;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base} (${count})`;
  });
  const rows = body
    .map((row) => Array.from({ length: width }, (_, index) => (row[index] ?? "").trim()))
    .filter((row) => row.some((cell) => cell !== ""));
  if (rows.length === 0) throw new ValidationError("The file has no data rows");
  return { headers, rows };
}

export async function readTable(kind: "csv" | "xlsx", bytes: Uint8Array): Promise<RawTable> {
  if (kind === "xlsx") {
    let sheet: unknown[][];
    try {
      sheet = (await readSheet(Buffer.from(bytes))) as unknown[][];
    } catch {
      throw new ValidationError("This Excel file could not be read. Save it as .xlsx or CSV.");
    }
    return buildTable(sheet.map((row) => row.map(cellText)));
  }
  const text = decodeFileBytes(bytes);
  return buildTable(parseDelimited(text, detectDelimiter(text)).map((row) => row.map(cellText)));
}
