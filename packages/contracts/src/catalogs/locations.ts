import { COUNTRY_OPTIONS } from "./countries.data.js";
import { TIMEZONE_OPTIONS } from "./timezones.data.js";

export type { CountryOption } from "./countries.data.js";
export type { TimezoneOption } from "./timezones.data.js";
export { COUNTRY_OPTIONS, TIMEZONE_OPTIONS };

/** ISO 3166-1 alpha-2 codes the app accepts. */
export const COUNTRY_CODES = COUNTRY_OPTIONS.map((country) => country.code);
/** IANA time zone names the app accepts. */
export const TIMEZONE_VALUES = TIMEZONE_OPTIONS.map((timezone) => timezone.value);

const countryCodes = new Set(COUNTRY_CODES);
const timezoneValues = new Set(TIMEZONE_VALUES);

export function isCountryCode(value: string): boolean {
  return countryCodes.has(value);
}

export function isTimezone(value: string): boolean {
  return timezoneValues.has(value);
}
