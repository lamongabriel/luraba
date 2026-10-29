ALTER TYPE "public"."credit_expense_timing" ADD VALUE IF NOT EXISTS 'month_after_payment';
--> statement-breakpoint
CREATE TABLE "budget_month_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "household_id" uuid NOT NULL,
  "month" date NOT NULL,
  "credit_expense_timing" "credit_expense_timing",
  "credit_installment_budget_mode" "credit_installment_budget_mode",
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "budget_month_settings" ADD CONSTRAINT "budget_month_settings_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "budget_month_settings_household_month_unique" ON "budget_month_settings" USING btree ("household_id","month");
