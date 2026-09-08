import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { accountsTable } from "./accounts.schema";
import {
  cashAccountSubtypeEnum,
  cryptoAccountSubtypeEnum,
  investmentAccountSubtypeEnum,
  loanAccountSubtypeEnum,
  loanInterestRateTypeEnum,
  loanPaymentFrequencyEnum,
  otherAssetSubtypeEnum,
  otherLiabilitySubtypeEnum,
  propertyAccountSubtypeEnum,
  propertyAreaUnitEnum,
  vehicleAccountSubtypeEnum,
  vehicleMileageUnitEnum,
} from "./enums.schema";

export const cashAccountProfilesTable = pgTable("cash_account_profiles", {
  accountId: uuid("account_id")
    .primaryKey()
    .references(() => accountsTable.id, { onDelete: "cascade" }),
  subtype: cashAccountSubtypeEnum().notNull(),
});

export const investmentAccountProfilesTable = pgTable("investment_account_profiles", {
  accountId: uuid("account_id")
    .primaryKey()
    .references(() => accountsTable.id, { onDelete: "cascade" }),
  subtype: investmentAccountSubtypeEnum().notNull(),
});

export const cryptoAccountProfilesTable = pgTable("crypto_account_profiles", {
  accountId: uuid("account_id")
    .primaryKey()
    .references(() => accountsTable.id, { onDelete: "cascade" }),
  subtype: cryptoAccountSubtypeEnum().notNull(),
  walletAddress: varchar("wallet_address", { length: 255 }),
  network: varchar({ length: 64 }),
});

export const propertyAccountProfilesTable = pgTable(
  "property_account_profiles",
  {
    accountId: uuid("account_id")
      .primaryKey()
      .references(() => accountsTable.id, { onDelete: "cascade" }),
    subtype: propertyAccountSubtypeEnum().notNull(),
    addressLine1: varchar("address_line_1", { length: 255 }),
    addressLine2: varchar("address_line_2", { length: 255 }),
    city: varchar({ length: 128 }),
    region: varchar({ length: 128 }),
    postalCode: varchar("postal_code", { length: 32 }),
    countryCode: varchar("country_code", { length: 2 }),
    area: numeric({ precision: 12, scale: 2, mode: "number" }),
    areaUnit: propertyAreaUnitEnum("area_unit"),
    yearBuilt: integer("year_built"),
  },
  (table) => [
    check("property_account_profiles_area_check", sql`${table.area} is null or ${table.area} > 0`),
    check(
      "property_account_profiles_year_built_check",
      sql`${table.yearBuilt} is null or ${table.yearBuilt} between 0 and 9999`,
    ),
  ],
);

export const vehicleAccountProfilesTable = pgTable(
  "vehicle_account_profiles",
  {
    accountId: uuid("account_id")
      .primaryKey()
      .references(() => accountsTable.id, { onDelete: "cascade" }),
    subtype: vehicleAccountSubtypeEnum().notNull(),
    make: varchar({ length: 128 }),
    model: varchar({ length: 128 }),
    year: integer(),
    trim: varchar({ length: 128 }),
    vin: varchar({ length: 32 }),
    licensePlate: varchar("license_plate", { length: 32 }),
    mileage: integer(),
    mileageUnit: vehicleMileageUnitEnum("mileage_unit"),
  },
  (table) => [
    check(
      "vehicle_account_profiles_year_check",
      sql`${table.year} is null or ${table.year} between 1886 and 9999`,
    ),
    check(
      "vehicle_account_profiles_mileage_check",
      sql`${table.mileage} is null or ${table.mileage} >= 0`,
    ),
  ],
);

export const loanAccountProfilesTable = pgTable(
  "loan_account_profiles",
  {
    accountId: uuid("account_id")
      .primaryKey()
      .references(() => accountsTable.id, { onDelete: "cascade" }),
    subtype: loanAccountSubtypeEnum().notNull(),
    originalPrincipal: bigint("original_principal", { mode: "number" }),
    annualInterestRate: numeric("annual_interest_rate", {
      precision: 7,
      scale: 4,
      mode: "number",
    }),
    interestRateType: loanInterestRateTypeEnum("interest_rate_type"),
    termMonths: integer("term_months"),
    startDate: date("start_date"),
    maturityDate: date("maturity_date"),
    paymentAmount: bigint("payment_amount", { mode: "number" }),
    paymentFrequency: loanPaymentFrequencyEnum("payment_frequency"),
    securedAssetAccountId: uuid("secured_asset_account_id").references(() => accountsTable.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("loan_account_profiles_secured_asset_idx").on(table.securedAssetAccountId),
    check(
      "loan_account_profiles_original_principal_check",
      sql`${table.originalPrincipal} is null or ${table.originalPrincipal} > 0`,
    ),
    check(
      "loan_account_profiles_annual_rate_check",
      sql`${table.annualInterestRate} is null or ${table.annualInterestRate} >= 0`,
    ),
    check(
      "loan_account_profiles_term_months_check",
      sql`${table.termMonths} is null or ${table.termMonths} > 0`,
    ),
    check(
      "loan_account_profiles_payment_amount_check",
      sql`${table.paymentAmount} is null or ${table.paymentAmount} > 0`,
    ),
    check(
      "loan_account_profiles_date_order_check",
      sql`${table.startDate} is null or ${table.maturityDate} is null or ${table.startDate} <= ${table.maturityDate}`,
    ),
  ],
);

export const otherAssetAccountProfilesTable = pgTable("other_asset_account_profiles", {
  accountId: uuid("account_id")
    .primaryKey()
    .references(() => accountsTable.id, { onDelete: "cascade" }),
  subtype: otherAssetSubtypeEnum().notNull(),
});

export const otherLiabilityAccountProfilesTable = pgTable("other_liability_account_profiles", {
  accountId: uuid("account_id")
    .primaryKey()
    .references(() => accountsTable.id, { onDelete: "cascade" }),
  subtype: otherLiabilitySubtypeEnum().notNull(),
});
