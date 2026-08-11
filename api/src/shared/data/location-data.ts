import countryData from './countries.json' with { type: 'json' };
import timezoneData from './timezones.json' with { type: 'json' };

export type CountryOption = {
  code: string;
  emoji: string;
  image: string;
  name: string;
};

export type TimezoneOption = {
  abbreviation: string;
  isDaylightSaving: boolean;
  label: string;
  offset: number;
  value: string;
};

const countries = countryData as CountryOption[];
const timezones = timezoneData as TimezoneOption[];
const countryCodes = new Set(countries.map((country) => country.code));
const timezoneValues = new Set(timezones.map((timezone) => timezone.value));

export function listCountries(): readonly CountryOption[] {
  return countries;
}

export function listTimezones(): readonly TimezoneOption[] {
  return timezones;
}

export function listCountryCodes(): readonly string[] {
  return countries.map((country) => country.code);
}

export function listTimezoneValues(): readonly string[] {
  return timezones.map((timezone) => timezone.value);
}

export function isCountryCode(value: string): boolean {
  return countryCodes.has(value);
}

export function isTimezone(value: string): boolean {
  return timezoneValues.has(value);
}
