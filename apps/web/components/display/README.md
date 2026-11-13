# Display components

The one way to show an **account, credit card, transaction type, merchant, product, amount, currency, category or tag**
anywhere in the web app (tables, drawers, cards, forms, pickers). Do not build a local avatar, icon,
badge or colored money text for these. If the case you need is missing, extend this folder.

```tsx
import { AccountDisplay, AmountDisplay, CategoryDisplay, MerchantDisplay, TagDisplay, TransactionTypeDisplay } from "@/components/display";
```

| Component | Shows | Key props |
| --- | --- | --- |
| `AccountDisplay` / `AccountMark` | Any account object (`Account`, `AccountSummary`, `AccountDetails`, `CreditCard`): picture or icon + name | `account` (null renders "No account"), `size`, `detail="none" \| "type" \| "full"` (`full` = `Institution · Type · CUR`) |
| `CreditCardDisplay` | A credit card led by its institution: bank logo (else bank icon) + institution name, then `Card name ••1234` with the brand mark. Use it where several cards sit together and the bank matters | `card` (a `CreditCard` or overview card), `size` |
| `MemberDisplay` / `MemberMark` | Who created a record: a household member's picture or initials + name | `userId` (a record's `createdByUserId`; unknown or null renders "Unknown"), `size` |
| `TransactionTypeMark` | The type glyph in a tile (leading mark of a list row with no merchant) | `type`, `size` |
| `TransactionTypeDisplay` | Expense, income, transfer, adjustment, card purchase, card payment, refund (shown as money back, green with a plus; `REFUND_REASON_LABELS` names the reason) | `type`, `variant="badge" \| "inline" \| "icon"`, `size` |
| `MerchantDisplay` / `MerchantMark` | Logo, else a shop icon, + name | `merchant`, `size`, `detail="domain"` |
| `HouseholdDisplay` / `HouseholdMark` | Uploaded picture, else initials, + name | `household`, `size` |
| `ProductDisplay` / `ProductMark` | Product (or a transaction item): picture, else a package icon, + name on one compact line, optional muted `detail` (price) after the name | `product`, `size`, `detail` |
| `BillStateDisplay` | Chip for a bill payment's state (upcoming, overdue, paid, skipped) or a bill's status (paused, canceled); labels and tones in `BILL_STATE_DISPLAY` | `state` |
| `AmountDisplay` | Money with the right sign and color | `amount` (minor units), `currencyCode`, `kind`, `size` |
| `CombinedAmountDisplay` + `CombinedHint` | **One headline number across currencies**: the total in the household base currency (API `CombinedAmount` + `CombinedFx`), with the per-currency amounts and rates in a popover; a missing rate shows each currency on its own. `CombinedHint` is the muted "≈ converted at <date>" / "Rate unavailable for EUR" line. Use these for every KPI/total that can span currencies; per-card and per-account rows keep `AmountDisplay` in their own currency | `combined`, `fx`, `size`, `kind`; hint: `fallback` |
| `CurrencyDisplay` | A currency: country flag + 3-letter code + symbol (`🇧🇷 BRL R$`), optional name | `currencyCode`, `showName`, `size` |
| `CategoryDisplay` | Category chip; `null` renders "Uncategorized". A subcategory with no icon shows its parent's icon (looked up in the shared categories list when `parentId` is on the object) | `category`, `variant="chip" \| "inline"`, `size` |
| `TagDisplay` | Tag chip | `tag`, `variant`, `size` |

## Option selects

Every searchable choice that is shared across forms is a component here, never a hand-built
`FormItem type="select"` with a local options array. Each exists in two forms with the same combobox
look: `XSelect` for react-hook-form (`control`, `name`, `label`, `description`, `disabled`, like
`FormItem`) and `XSelectControl` for plain state (`id`, `value`, `onChange`).

| Select | Choices come from | Shows |
| --- | --- | --- |
| `CurrencySelect` (`exclude`, `only`) | API currencies (symbol, precision) + `CURRENCY_CATALOG` (name, flag) | flag, code, symbol, name |
| `CountrySelect` | API `/reference-data/locations` | flag, name, ISO code |
| `TimeZoneSelect` | API `/reference-data/locations` | IANA name, friendly name, GMT offset |
| `LanguageSelect` | `LANGUAGE_CATALOG` | flag, English and native name |
| `DateFormatSelect` | `DATE_FORMAT_CATALOG` | format with an example date |
| `AccountSelect` / `AccountSelectControl` (`accounts`) | Any accounts or credit cards you pass | picture or icon, name, institution · type · currency (`Visa •••• 1234` for cards) |
| `PreferredPeriodSelectControl`, `PreferredThemeSelectControl` | `@luraba/contracts` `catalogs/preferences.ts` | capitalized label |

The lists, labels and flags live in [`@luraba/contracts` catalogs](../../../../packages/contracts/src/catalogs/README.md); change them there.

Sizes are `xs | sm | md | lg` everywhere (`DISPLAY_SIZES`).

## What picture an account gets

`getAccountVisual` decides, in this order:

1. The picture the user **uploaded** for the account (`imageUploadId`, edited in the account sheet via
   `components/accounts/account-image-field.tsx`). A car photo, a house, a logo.
2. A credit card shows its **brand** logo (Visa, Mastercard...).
3. The institution logo (Brandfetch) when there is one.
4. The **type icon** from the catalog: cash is a wallet, vehicle a car (motorcycle, truck... have their
   own via `ACCOUNT_SUBTYPE_ICONS`), loan a loan icon, and so on.

## Amounts

`kind` says what the money is: `income` (+, green), `expense` (-, red), `transfer` and `neutral`
(no sign, plain). `kind="auto"` uses the sign of `amount`. Pass the number as stored; the component
formats its absolute value. Use `amountKindForTransactionType(type)` when you have a transaction.

## Change the look in one place

Everything visual is in `constants.ts`: `ACCOUNT_TYPE_DISPLAY` (label, icon, color per account type,
the app's account-type catalog), `ACCOUNT_SUBTYPE_ICONS`, `TRANSACTION_TYPE_DISPLAY`,
`AMOUNT_KIND_DISPLAY`, `MERCHANT_FALLBACK`, `DISPLAY_SIZES` and `EMPTY_LABELS`. Adding an account type
means adding it to the contracts and to `ACCOUNT_TYPE_DISPLAY` (typed as a full `Record`, so
TypeScript forces it).

## Merchants

`MerchantDisplay` shows the uploaded logo (`imageUploadId`), else the domain-derived `logoUrl`, else a shop icon. Logos are uploaded from the merchant sheet on `/household/merchants` (`components/merchants/merchant-image-field.tsx`, built on the shared `components/uploads/entity-image-field.tsx`).

## Products

`ProductDisplay` shows the uploaded picture (`imageUploadId`), else a package icon. It accepts a product or a transaction item (anything with `name` and `imageUploadId`). Pictures are uploaded from the product sheet (opened from the transaction form) (`components/products/product-image-field.tsx`).

Tests: `__tests__/display.test.tsx`.
