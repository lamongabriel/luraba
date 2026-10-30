# Option catalogs

One place per kind of option, shared by the API and the web app (and any future service), so every
select, validation and label agrees and can be translated later. Import from `@luraba/contracts`
(or `@luraba/contracts/catalogs`). Neither the API nor the web app declares its own list of
currencies, countries, languages, time zones, date formats, periods or themes.

| Catalog | File | Notes |
| --- | --- | --- |
| Currencies | `currencies.ts` (`CURRENCY_CATALOG`, `CURRENCY_CODES`, `resolveCurrency`) | The database owns which currencies exist, their symbol and precision (`GET /currencies`); the catalog adds name, flag country, fallback symbol/decimals and the code enum. Add a row when you seed a currency. |
| Countries | `countries.data.ts`, `locations.ts` (`COUNTRY_CODES`, `isCountryCode`) | ISO 3166-1 alpha-2; the API validates with it and serves it at `/reference-data/locations`. `flags.ts` (`flagEmoji`) derives a flag from any code. |
| Time zones | `timezones.data.ts`, `locations.ts` (`TIMEZONE_VALUES`, `isTimezone`) | IANA names; same use. Browser-only formatting (GMT offsets) lives in `apps/web/lib/timezones.ts`. |
| Languages, date formats, default period, theme | `preferences.ts` | Values in `../preferences.ts`; labels here, typed as full `Record`s so a new value fails to compile until labeled. |

## Rules

- Labels are plain English strings, properly capitalized ("Monthly", "This month"), kept here and
  nowhere else. Never `value.replaceAll("_", " ")` in a page.
- A new option kind adds its values (enum) and labels here first; API validation and web selects follow.
- The web app shows them with the selects in `apps/web/components/display` (`CurrencySelect`,
  `CountrySelect`, `TimeZoneSelect`, `LanguageSelect`, `DateFormatSelect`) and `CurrencyDisplay`.
- `catalogOptions(catalog)` turns a `Record` catalog into an ordered options array; `labelFor` reads a label.
- Data credits: see `apps/api/src/shared/data/LOCATION_DATA.md`.

Tests: `__tests__/catalogs.test.ts`.
