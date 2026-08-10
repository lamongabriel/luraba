CREATE TABLE IF NOT EXISTS "recurring_bills" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "household_id" uuid NOT NULL REFERENCES "households"("id") ON DELETE CASCADE,
  "owner_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "name" varchar(255) NOT NULL,
  "description" text,
  "type" varchar(16) NOT NULL CHECK ("type" IN ('income', 'expense')),
  "status" varchar(16) NOT NULL DEFAULT 'active' CHECK ("status" IN ('active', 'paused', 'archived')),
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE RESTRICT,
  "category_id" uuid REFERENCES "categories"("id") ON DELETE SET NULL,
  "merchant_id" uuid REFERENCES "merchants"("id") ON DELETE SET NULL,
  "payment_method_id" uuid REFERENCES "payment_methods"("id") ON DELETE SET NULL,
  "amount" bigint NOT NULL,
  "currency_code" varchar(3) NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date,
  "frequency" varchar(16) NOT NULL CHECK ("frequency" IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  "day_of_month" integer,
  "day_of_week" integer,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recurring_bills_household_idx" ON "recurring_bills" ("household_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recurring_bills_status_idx" ON "recurring_bills" ("household_id", "status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recurring_bill_occurrences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "recurring_bill_id" uuid NOT NULL REFERENCES "recurring_bills"("id") ON DELETE CASCADE,
  "occurrence_date" date NOT NULL,
  "status" varchar(16) NOT NULL DEFAULT 'scheduled' CHECK ("status" IN ('scheduled', 'skipped', 'created', 'rescheduled')),
  "rescheduled_date" date,
  "transaction_id" uuid REFERENCES "transactions"("id") ON DELETE SET NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "recurring_bill_occurrence_date_unique" UNIQUE ("recurring_bill_id", "occurrence_date")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recurring_bill_occurrences_date_idx" ON "recurring_bill_occurrences" ("occurrence_date");
