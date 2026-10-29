# Numbers, money and dates

One implementation of each, shared by the web app, the API and the worker. Do not format by hand.

## Money

- Stored and sent as **integer minor units** (`1234` = 12.34). Conversions live in
  `@luraba/domain` (`toMinorUnits`, `fromMinorUnits`, `addMinorUnits`...).
- **Text** (notifications, reminders, logs): `formatMoney(minor, currency, { locale?, precision? })`.
  **Machine output** (CSV/JSON exports): `formatDecimalAmount(minor, precision)`.
- **Web display**: `AmountDisplay` (signed, colored) or `MoneyValue` from `components/display` and
  `components/finance`. Both call `formatCurrency` in `apps/web/lib/finance.ts`, which delegates to
  `formatMoney`. Never call `Intl.NumberFormat`, `toFixed` or `toLocaleString` for money.
- Currency fallbacks: `useDefaultCurrencyCode()` (the household default). Never write a currency code
  as a literal default in a component.

## Number inputs (web)

Every numeric field uses a shared mask from `components/ui/masked-input.tsx`; never `type="number"`.

| Need | Use | In `FormItem` |
| --- | --- | --- |
| An amount of money | `MoneyInput` (digits push in from the right, grouped) | `inputType="money"` (`precision`, `allowNegative`) |
| A whole number (days, counts) | `NumberInput decimals={0}` | `inputType="integer"` or `type="int"` |
| A decimal that is not money (rate, area) | `NumberInput decimals={n}` | `inputType="decimal" decimals={n}` |
| A calendar date | `DateInput` | `inputType="date"` |

The inputs carry **canonical strings** (`"1234.56"`); `FormItem` turns them into `number | ""` for
react-hook-form, so schemas keep working in major units and forms convert with `majorToMinorUnits`.
The masking logic is in `lib/number-format.ts` (unit tested). Plain read-only numbers use
`formatNumber` from `lib/finance.ts`.

## Dates

- **Everything is UTC.** A date field is a `YYYY-MM-DD` string; a moment is an ISO instant. Use the
  helpers in `@luraba/domain` (`date.ts`): `now()`, `todayISODate()`, `formatISODate`, `parseISODate`,
  `addDays`, `getUTCDate`/`getUTCDay`, `formatDisplayDate`/`formatShortDate` for display.
- Never use `new Date()` without going through `now()`, local getters (`getDate`, `getDay`,
  `getMonth`, `getFullYear`) or `toLocaleDateString`.
- Household-local "today" (reminders, billing cycles) uses `getTodayInTimezone(timezone)`.
