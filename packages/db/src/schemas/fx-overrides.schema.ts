import { bigint, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { currenciesTable } from "./currencies.schema.js";
import { householdsTable } from "./households.schema.js";

/** A rate the household pinned by hand for a currency pair; it wins over the market rate. */
export const householdFxOverridesTable = pgTable(
  "household_fx_overrides",
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => householdsTable.id, { onDelete: "cascade" }),
    fromCurrencyId: varchar("from_currency_id", { length: 3 })
      .notNull()
      .references(() => currenciesTable.code, { onDelete: "restrict" }),
    toCurrencyId: varchar("to_currency_id", { length: 3 })
      .notNull()
      .references(() => currenciesTable.code, { onDelete: "restrict" }),
    rateNumerator: bigint("rate_numerator", { mode: "number" }).notNull(),
    rateDenominator: bigint("rate_denominator", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("household_fx_overrides_pair_unique").on(
      table.householdId,
      table.fromCurrencyId,
      table.toCurrencyId,
    ),
  ],
);
