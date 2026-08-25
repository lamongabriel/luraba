import {
  isCountryCode,
  isTimezone,
  listCountries,
  listCountryCodes,
  listTimezones,
  listTimezoneValues,
} from '@/shared/data/location-data';
import { countryCodeSchema, timezoneSchema } from '@/shared/validation/preferences';

describe('location data', () => {
  it('exposes ISO country options with names, codes, and flag emoji', () => {
    const unitedStates = listCountries().find((country) => country.code === 'US');
    const brazil = listCountries().find((country) => country.code === 'BR');

    expect(unitedStates).toMatchObject({
      code: 'US',
      emoji: '🇺🇸',
      name: 'United States',
    });
    expect(brazil).toMatchObject({
      code: 'BR',
      emoji: '🇧🇷',
      name: 'Brazil',
    });
    expect(listCountries()).toHaveLength(258);
    expect(listCountryCodes()).toEqual(expect.arrayContaining(['BR', 'US']));
    expect(listCountries().every((country) => /^[A-Z]{2}$/.test(country.code))).toBe(true);
  });

  it('exposes selectable IANA timezones, including application defaults', () => {
    expect(listTimezones()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 'UTC' }),
        expect.objectContaining({ value: 'America/New_York' }),
        expect.objectContaining({ value: 'America/Sao_Paulo' }),
      ]),
    );
    expect(listTimezoneValues()).toContain('UTC');
    expect(listTimezones()).toHaveLength(438);
  });

  it('uses the catalogues as the validation source of truth', () => {
    expect(isCountryCode('US')).toBe(true);
    expect(isCountryCode('ZZ')).toBe(false);
    expect(isTimezone('America/Los_Angeles')).toBe(true);
    expect(isTimezone('Invalid/Timezone')).toBe(false);

    expect(countryCodeSchema.parse(' us ')).toBe('US');
    expect(() => countryCodeSchema.parse('ZZ')).toThrow();
    expect(timezoneSchema.parse(' America/New_York ')).toBe('America/New_York');
    expect(() => timezoneSchema.parse('Invalid/Timezone')).toThrow();
  });
});
