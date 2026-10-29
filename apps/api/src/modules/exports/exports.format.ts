import type { ExportTable } from "./exports.types";

function csvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  // Spreadsheets treat leading = + - @ as formulas; prefix text that is not a plain number.
  const safe = /^[=+\-@]/u.test(text) && Number.isNaN(Number(text)) ? `'${text}` : text;
  return /[",\r\n;]/u.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function toCsv(table: ExportTable): string {
  const lines = [table.columns.map(csvCell).join(",")];
  for (const record of table.records)
    lines.push(table.columns.map((c) => csvCell(record[c])).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}

export function toJson(tables: Record<string, ExportTable>): string {
  const names = Object.keys(tables);
  const single = names.length === 1 ? tables[names[0] as string] : undefined;
  return JSON.stringify(
    single ? single.records : Object.fromEntries(names.map((n) => [n, tables[n]?.records])),
    null,
    2,
  );
}
