const REGIONAL_INDICATOR_A = 0x1f1e6;

/**
 * Flag emoji for an ISO 3166-1 alpha-2 code (`BR` -> the Brazilian flag). `EU` works too.
 * Computed, so currencies and countries never need a stored flag. Unknown input returns "".
 */
export function flagEmoji(countryCode: string | null | undefined): string {
  const code = countryCode?.trim().toUpperCase();
  if (!code || !/^[A-Z]{2}$/u.test(code)) return "";
  return String.fromCodePoint(
    ...[...code].map((letter) => REGIONAL_INDICATOR_A + letter.charCodeAt(0) - 65),
  );
}
