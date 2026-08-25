ALTER TYPE "public"."account_type" RENAME TO "account_type_old";--> statement-breakpoint
CREATE TYPE "public"."account_type" AS ENUM(
  'cash',
  'investment',
  'crypto',
  'loan',
  'credit_card',
  'property',
  'vehicle',
  'other_asset',
  'other_liability'
);--> statement-breakpoint
ALTER TABLE "accounts"
  ALTER COLUMN "type" TYPE "public"."account_type"
  USING (
    CASE
      WHEN "type"::text = 'depository' THEN 'cash'
      ELSE "type"::text
    END
  )::"public"."account_type";--> statement-breakpoint
DROP TYPE "public"."account_type_old";--> statement-breakpoint

CREATE TYPE "public"."cash_account_subtype" AS ENUM(
  'checking',
  'savings',
  'cash',
  'money_market',
  'certificate_of_deposit',
  'prepaid',
  'other'
);--> statement-breakpoint
CREATE TYPE "public"."investment_account_subtype" AS ENUM(
  'brokerage',
  'retirement',
  'pension',
  'education',
  'employee_stock',
  'other'
);--> statement-breakpoint
CREATE TYPE "public"."crypto_account_subtype" AS ENUM(
  'exchange',
  'wallet',
  'custody',
  'staking',
  'other'
);--> statement-breakpoint
CREATE TYPE "public"."property_account_subtype" AS ENUM(
  'house',
  'apartment',
  'condominium',
  'land',
  'commercial',
  'storage',
  'parking',
  'other'
);--> statement-breakpoint
CREATE TYPE "public"."property_area_unit" AS ENUM('sqm', 'sqft');--> statement-breakpoint
CREATE TYPE "public"."vehicle_account_subtype" AS ENUM(
  'car',
  'motorcycle',
  'truck',
  'van',
  'recreational_vehicle',
  'boat',
  'aircraft',
  'other'
);--> statement-breakpoint
CREATE TYPE "public"."vehicle_mileage_unit" AS ENUM('km', 'mi');--> statement-breakpoint
CREATE TYPE "public"."loan_account_subtype" AS ENUM(
  'mortgage',
  'auto',
  'student',
  'personal',
  'business',
  'line_of_credit',
  'other'
);--> statement-breakpoint
CREATE TYPE "public"."loan_interest_rate_type" AS ENUM('fixed', 'variable');--> statement-breakpoint
CREATE TYPE "public"."loan_payment_frequency" AS ENUM(
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'annually',
  'other'
);--> statement-breakpoint
CREATE TYPE "public"."other_asset_subtype" AS ENUM(
  'collectible',
  'precious_metal',
  'business_ownership',
  'receivable',
  'other'
);--> statement-breakpoint
CREATE TYPE "public"."other_liability_subtype" AS ENUM(
  'tax',
  'medical',
  'payable',
  'legal',
  'other'
);--> statement-breakpoint

CREATE TABLE "cash_account_profiles" (
  "account_id" uuid PRIMARY KEY NOT NULL,
  "subtype" "cash_account_subtype" NOT NULL
);--> statement-breakpoint
CREATE TABLE "investment_account_profiles" (
  "account_id" uuid PRIMARY KEY NOT NULL,
  "subtype" "investment_account_subtype" NOT NULL
);--> statement-breakpoint
CREATE TABLE "crypto_account_profiles" (
  "account_id" uuid PRIMARY KEY NOT NULL,
  "subtype" "crypto_account_subtype" NOT NULL,
  "wallet_address" varchar(255),
  "network" varchar(64)
);--> statement-breakpoint
CREATE TABLE "property_account_profiles" (
  "account_id" uuid PRIMARY KEY NOT NULL,
  "subtype" "property_account_subtype" NOT NULL,
  "address_line_1" varchar(255),
  "address_line_2" varchar(255),
  "city" varchar(128),
  "region" varchar(128),
  "postal_code" varchar(32),
  "country_code" varchar(2),
  "area" numeric(12, 2),
  "area_unit" "property_area_unit",
  "year_built" integer,
  CONSTRAINT "property_account_profiles_area_check" CHECK ("area" IS NULL OR "area" > 0),
  CONSTRAINT "property_account_profiles_year_built_check"
    CHECK ("year_built" IS NULL OR "year_built" BETWEEN 0 AND 9999)
);--> statement-breakpoint
CREATE TABLE "vehicle_account_profiles" (
  "account_id" uuid PRIMARY KEY NOT NULL,
  "subtype" "vehicle_account_subtype" NOT NULL,
  "make" varchar(128),
  "model" varchar(128),
  "year" integer,
  "trim" varchar(128),
  "vin" varchar(32),
  "license_plate" varchar(32),
  "mileage" integer,
  "mileage_unit" "vehicle_mileage_unit",
  CONSTRAINT "vehicle_account_profiles_year_check"
    CHECK ("year" IS NULL OR "year" BETWEEN 1886 AND 9999),
  CONSTRAINT "vehicle_account_profiles_mileage_check" CHECK ("mileage" IS NULL OR "mileage" >= 0)
);--> statement-breakpoint
CREATE TABLE "loan_account_profiles" (
  "account_id" uuid PRIMARY KEY NOT NULL,
  "subtype" "loan_account_subtype" NOT NULL,
  "original_principal" bigint,
  "annual_interest_rate" numeric(7, 4),
  "interest_rate_type" "loan_interest_rate_type",
  "term_months" integer,
  "start_date" date,
  "maturity_date" date,
  "payment_amount" bigint,
  "payment_frequency" "loan_payment_frequency",
  "secured_asset_account_id" uuid,
  CONSTRAINT "loan_account_profiles_original_principal_check"
    CHECK ("original_principal" IS NULL OR "original_principal" > 0),
  CONSTRAINT "loan_account_profiles_annual_rate_check"
    CHECK ("annual_interest_rate" IS NULL OR "annual_interest_rate" >= 0),
  CONSTRAINT "loan_account_profiles_term_months_check"
    CHECK ("term_months" IS NULL OR "term_months" > 0),
  CONSTRAINT "loan_account_profiles_payment_amount_check"
    CHECK ("payment_amount" IS NULL OR "payment_amount" > 0),
  CONSTRAINT "loan_account_profiles_date_order_check"
    CHECK ("start_date" IS NULL OR "maturity_date" IS NULL OR "start_date" <= "maturity_date")
);--> statement-breakpoint
CREATE TABLE "other_asset_account_profiles" (
  "account_id" uuid PRIMARY KEY NOT NULL,
  "subtype" "other_asset_subtype" NOT NULL
);--> statement-breakpoint
CREATE TABLE "other_liability_account_profiles" (
  "account_id" uuid PRIMARY KEY NOT NULL,
  "subtype" "other_liability_subtype" NOT NULL
);--> statement-breakpoint

ALTER TABLE "cash_account_profiles" ADD CONSTRAINT "cash_account_profiles_account_id_accounts_id_fk"
  FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "investment_account_profiles" ADD CONSTRAINT "investment_account_profiles_account_id_accounts_id_fk"
  FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "crypto_account_profiles" ADD CONSTRAINT "crypto_account_profiles_account_id_accounts_id_fk"
  FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "property_account_profiles" ADD CONSTRAINT "property_account_profiles_account_id_accounts_id_fk"
  FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "vehicle_account_profiles" ADD CONSTRAINT "vehicle_account_profiles_account_id_accounts_id_fk"
  FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "loan_account_profiles" ADD CONSTRAINT "loan_account_profiles_account_id_accounts_id_fk"
  FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "loan_account_profiles" ADD CONSTRAINT "loan_account_profiles_secured_asset_account_id_accounts_id_fk"
  FOREIGN KEY ("secured_asset_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null;--> statement-breakpoint
ALTER TABLE "other_asset_account_profiles" ADD CONSTRAINT "other_asset_account_profiles_account_id_accounts_id_fk"
  FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "other_liability_account_profiles" ADD CONSTRAINT "other_liability_account_profiles_account_id_accounts_id_fk"
  FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade;--> statement-breakpoint

CREATE INDEX "loan_account_profiles_secured_asset_idx"
  ON "loan_account_profiles" USING btree ("secured_asset_account_id");--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_type_classification_check" CHECK (
  ("type" IN ('cash', 'investment', 'crypto', 'property', 'vehicle', 'other_asset') AND "classification" = 'asset')
  OR
  ("type" IN ('loan', 'credit_card', 'other_liability') AND "classification" = 'liability')
);--> statement-breakpoint

INSERT INTO "cash_account_profiles" ("account_id", "subtype")
SELECT "id", 'other' FROM "accounts" WHERE "type" = 'cash';--> statement-breakpoint
INSERT INTO "investment_account_profiles" ("account_id", "subtype")
SELECT "id", 'other' FROM "accounts" WHERE "type" = 'investment';--> statement-breakpoint
INSERT INTO "crypto_account_profiles" ("account_id", "subtype")
SELECT "id", 'other' FROM "accounts" WHERE "type" = 'crypto';--> statement-breakpoint
INSERT INTO "loan_account_profiles" ("account_id", "subtype")
SELECT "id", 'other' FROM "accounts" WHERE "type" = 'loan';--> statement-breakpoint
INSERT INTO "property_account_profiles" ("account_id", "subtype")
SELECT "id", 'other' FROM "accounts" WHERE "type" = 'property';--> statement-breakpoint
INSERT INTO "vehicle_account_profiles" ("account_id", "subtype")
SELECT "id", 'other' FROM "accounts" WHERE "type" = 'vehicle';--> statement-breakpoint
INSERT INTO "other_asset_account_profiles" ("account_id", "subtype")
SELECT "id", 'other' FROM "accounts" WHERE "type" = 'other_asset';--> statement-breakpoint
INSERT INTO "other_liability_account_profiles" ("account_id", "subtype")
SELECT "id", 'other' FROM "accounts" WHERE "type" = 'other_liability';
