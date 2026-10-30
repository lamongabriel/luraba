/** The country and time zone lists live in `@luraba/contracts/catalogs`; this file keeps the API's accessors. */
import {
  COUNTRY_CODES,
  COUNTRY_OPTIONS,
  type CountryOption,
  isCountryCode,
  isTimezone,
  TIMEZONE_OPTIONS,
  TIMEZONE_VALUES,
  type TimezoneOption,
} from "@luraba/contracts/catalogs";

export type { CountryOption, TimezoneOption };
export { isCountryCode, isTimezone };

export function listCountries(): readonly CountryOption[] {
  return COUNTRY_OPTIONS;
}

export function listTimezones(): readonly TimezoneOption[] {
  return TIMEZONE_OPTIONS;
}

export function listCountryCodes(): readonly string[] {
  return COUNTRY_CODES;
}

export function listTimezoneValues(): readonly string[] {
  return TIMEZONE_VALUES;
}
