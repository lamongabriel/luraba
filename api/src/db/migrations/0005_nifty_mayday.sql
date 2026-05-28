ALTER TABLE "households" ADD COLUMN "credit_expense_timing" "credit_expense_timing" NOT NULL DEFAULT 'spend_month';
--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "credit_installment_budget_mode" "credit_installment_budget_mode" NOT NULL DEFAULT 'per_installment';
--> statement-breakpoint
UPDATE "households" AS "household"
SET
  "country_code" = "user"."country_code",
  "budget_month_starts_on" = "user"."budget_month_starts_on",
  "credit_expense_timing" = "user"."credit_expense_timing",
  "credit_installment_budget_mode" = "user"."credit_installment_budget_mode"
FROM "users" AS "user"
WHERE "household"."created_by_user_id" = "user"."id";
--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "default_period" TO "preferred_period";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "default_account_order";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "country_code";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "budget_month_starts_on";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "credit_expense_timing";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "credit_installment_budget_mode";
