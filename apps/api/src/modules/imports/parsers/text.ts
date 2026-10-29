/** Small, dependency-free helpers shared by the adapters. */

/** Decodes file bytes: UTF-8 when valid, otherwise Windows-1252 (what older OFX exports use). */
export function decodeFileBytes(bytes: Uint8Array): string {
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 600));
  const charset = /CHARSET:\s*(\w+)/i.exec(head)?.[1];
  let text: string;
  if (charset && /^(1252|windows-1252|latin1|iso-8859-1)$/i.test(charset)) {
    text = new TextDecoder("windows-1252").decode(bytes);
  } else {
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      text = new TextDecoder("windows-1252").decode(bytes);
    }
  }
  return text.replace(/^﻿/, "");
}

/** Lowercase, accent-free, single-spaced: the key used to remember mappings. */
export function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}*&]+/gu, " ")
    .trim();
}

export function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Reads a money string into minor units (2 decimals). `decimal` is the decimal separator the
 * source uses; the other of `.` and `,` is treated as a thousands separator. Accepts "- 2.150,95",
 * "(10,00)", "R$ 1.600,65" and "5682.14". Returns null when it is not a number.
 */
export function parseAmount(input: string | undefined | null, decimal: "," | "."): number | null {
  if (input === undefined || input === null) return null;
  let text = input.replace(/R\$|\$|€|£|\s/gu, "");
  if (text === "") return null;
  let negative = false;
  if (/^\(.*\)$/u.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }
  if (text.startsWith("-")) {
    negative = !negative;
    text = text.slice(1);
  } else if (text.startsWith("+")) {
    text = text.slice(1);
  }
  const thousands = decimal === "," ? "." : ",";
  const cleaned = text.split(thousands).join("");
  if (!/^\d*(\.\d*|,\d*)?$/u.test(cleaned) || !/\d/u.test(cleaned)) return null;
  const normalized = decimal === "," ? cleaned.replace(",", ".") : cleaned;
  const [whole = "0", fraction = ""] = normalized.split(".");
  if (fraction.length > 2) return null;
  const minor = Number(whole || "0") * 100 + Number(fraction.padEnd(2, "0") || "0");
  if (!Number.isSafeInteger(minor)) return null;
  return negative ? -minor : minor;
}

/** `dd/mm/yyyy` or `yyyy-mm-dd` (or `yyyymmdd`) into `YYYY-MM-DD`; null when not a real date. */
export function parseDate(input: string | undefined | null): string | null {
  if (!input) return null;
  const text = input.trim();
  const patterns: Array<[RegExp, [number, number, number]]> = [
    [/^(\d{2})\/(\d{2})\/(\d{4})$/u, [3, 2, 1]],
    [/^(\d{4})-(\d{2})-(\d{2})/u, [1, 2, 3]],
    [/^(\d{4})(\d{2})(\d{2})/u, [1, 2, 3]],
  ];
  let parts: [number, number, number] | undefined;
  for (const [pattern, order] of patterns) {
    const match = pattern.exec(text);
    if (match) {
      parts = [Number(match[order[0]]), Number(match[order[1]]), Number(match[order[2]])];
      break;
    }
  }
  if (!parts) return null;
  const [year, month, day] = parts;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Splits delimited text honouring quotes (`""` is a quote) and CRLF. Blank lines are dropped. */
export function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const pushRow = () => {
    row.push(field);
    field = "";
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      pushRow();
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) pushRow();
  return rows;
}

export function minMaxDates(dates: Array<string | null>): {
  min: string | null;
  max: string | null;
} {
  const valid = dates.filter((d): d is string => d !== null).sort();
  return { min: valid[0] ?? null, max: valid[valid.length - 1] ?? null };
}
