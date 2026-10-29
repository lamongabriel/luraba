import { getLocale } from "@/lib/finance";

/**
 * Number masks shared by every numeric input. Values travel as canonical decimal strings
 * (`"1234.5"`, `"-12.34"`, `""`), the same form `Number()` and the forms' `majorToMinorUnits`
 * understand; only the text shown to the user is localized.
 */

export type NumberSeparators = { group: string; decimal: string };

export function getNumberSeparators(language = "en"): NumberSeparators {
  const parts = new Intl.NumberFormat(getLocale(language)).formatToParts(1234567.5);
  return {
    group: parts.find((part) => part.type === "group")?.value ?? ",",
    decimal: parts.find((part) => part.type === "decimal")?.value ?? ".",
  };
}

/** Groups the integer digits of a canonical decimal string: `"1234567.5"` -> `"1,234,567.5"`. */
function groupIntegerDigits(integerPart: string, group: string): string {
  return integerPart.replace(/\B(?=(\d{3})+(?!\d))/gu, group);
}

/** Canonical decimal string -> masked text (keeps a trailing decimal separator while typing). */
export function maskDecimalString(canonical: string, language = "en"): string {
  if (canonical === "") return "";
  const { group, decimal } = getNumberSeparators(language);
  const negative = canonical.startsWith("-");
  const unsigned = negative ? canonical.slice(1) : canonical;
  const [integerPart = "", fraction] = unsigned.split(".");
  const grouped = groupIntegerDigits(integerPart === "" ? "0" : integerPart, group);
  return `${negative ? "-" : ""}${grouped}${fraction === undefined ? "" : `${decimal}${fraction}`}`;
}

/**
 * Masked text typed by the user -> canonical decimal string. Digits, one decimal separator (`.` or
 * `,` are both accepted as the decimal mark when the locale's group mark is not that character) and
 * a leading minus survive; everything else is dropped. `decimals` caps the fraction digits.
 */
export function unmaskDecimalString(
  text: string,
  options: { decimals: number; allowNegative?: boolean; language?: string },
): string {
  const { group, decimal } = getNumberSeparators(options.language);
  const negative = options.allowNegative === true && text.trimStart().startsWith("-");
  let cleaned = "";
  let seenDecimal = false;
  for (const char of text) {
    if (/\d/u.test(char)) {
      cleaned += char;
    } else if (
      options.decimals > 0 &&
      !seenDecimal &&
      (char === decimal || (char === "." && group !== ".") || (char === "," && group !== ","))
    ) {
      seenDecimal = true;
      cleaned += ".";
    }
  }
  if (cleaned === "" || cleaned === ".") return negative ? "-" : "";
  const [integerPart = "", fraction] = cleaned.split(".");
  const integerDigits = integerPart.replace(/^0+(?=\d)/u, "") || "0";
  const result =
    fraction === undefined
      ? integerDigits
      : `${integerDigits}.${fraction.slice(0, options.decimals)}`;
  return negative ? `-${result}` : result;
}

/**
 * Bank-app style money entry: digits push in from the right, so typing `1`,`2`,`3`,`4` shows
 * `12.34`. Returns the canonical string for the typed text at the given currency precision.
 */
export function unmaskMoneyString(
  text: string,
  options: { precision: number; allowNegative?: boolean },
): string {
  const negative = options.allowNegative === true && text.includes("-");
  const digits = text.replace(/\D/gu, "").replace(/^0+/u, "");
  if (digits === "") return negative ? "-" : "";
  const padded = digits.padStart(options.precision + 1, "0");
  const integerPart = padded.slice(0, padded.length - options.precision);
  const fraction = padded.slice(padded.length - options.precision);
  const result = options.precision > 0 ? `${integerPart}.${fraction}` : integerPart;
  return negative ? `-${result}` : result;
}

/** Canonical (or number) value -> the string a controlled input should hold. */
export function toCanonicalString(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  return typeof value === "number" ? (Number.isFinite(value) ? String(value) : "") : value;
}
