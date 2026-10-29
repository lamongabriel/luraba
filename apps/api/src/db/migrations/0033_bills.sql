-- The first recurring-bills prototype was removed from the app but its tables remained.
-- Drop them when empty; otherwise keep the data under a legacy_ prefix for manual migration.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "recurring_bills" LIMIT 1)
     OR EXISTS (SELECT 1 FROM "recurring_bill_occurrences" LIMIT 1) THEN
    ALTER TABLE "recurring_bill_occurrences" RENAME TO "legacy_recurring_bill_occurrences";
    ALTER TABLE "recurring_bills" RENAME TO "legacy_recurring_bills";
  ELSE
    DROP TABLE "recurring_bill_occurrences";
    DROP TABLE "recurring_bills";
  END IF;
END $$;
--> statement-breakpoint
CREATE TYPE "public"."bill_frequency" AS ENUM('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly');
--> statement-breakpoint
CREATE TYPE "public"."bill_status" AS ENUM('active', 'paused', 'canceled');
--> statement-breakpoint
CREATE TYPE "public"."bill_audience" AS ENUM('owner', 'household');
--> statement-breakpoint
CREATE TABLE "bills" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "household_id" uuid NOT NULL,
  "created_by_user_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "expected_amount" bigint NOT NULL,
  "currency_code" varchar(3) NOT NULL,
  "frequency" "bill_frequency" NOT NULL,
  "day_of_month" integer,
  "day_of_week" integer,
  "start_date" date NOT NULL,
  "end_date" date,
  "installment_count" integer,
  "status" "bill_status" DEFAULT 'active' NOT NULL,
  "category_id" uuid,
  "merchant_id" uuid,
  "remind_days_before" integer,
  "audience" "bill_audience" DEFAULT 'owner' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bill_occurrences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "bill_id" uuid NOT NULL,
  "due_date" date NOT NULL,
  "installment_number" integer,
  "expected_amount" bigint NOT NULL,
  "paid_at" timestamp,
  "skipped_at" timestamp,
  "transaction_id" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_currency_code_currencies_code_fk" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "bill_occurrences" ADD CONSTRAINT "bill_occurrences_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "bill_occurrences" ADD CONSTRAINT "bill_occurrences_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "bills_household_id_idx" ON "bills" USING btree ("household_id");
--> statement-breakpoint
CREATE INDEX "bills_household_status_idx" ON "bills" USING btree ("household_id","status");
--> statement-breakpoint
CREATE UNIQUE INDEX "bill_occurrences_bill_due_date_unique" ON "bill_occurrences" USING btree ("bill_id","due_date");
--> statement-breakpoint
CREATE UNIQUE INDEX "bill_occurrences_transaction_unique" ON "bill_occurrences" USING btree ("transaction_id") WHERE "bill_occurrences"."transaction_id" is not null;
--> statement-breakpoint
CREATE INDEX "bill_occurrences_due_date_idx" ON "bill_occurrences" USING btree ("due_date");
