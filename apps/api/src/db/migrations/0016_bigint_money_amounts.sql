ALTER TABLE "budgets" ALTER COLUMN "amount" TYPE bigint USING "amount"::bigint;--> statement-breakpoint
ALTER TABLE "entries" ALTER COLUMN "amount" TYPE bigint USING "amount"::bigint;--> statement-breakpoint
ALTER TABLE "credit_cards" ALTER COLUMN "unapplied_credit_amount" TYPE bigint USING "unapplied_credit_amount"::bigint;--> statement-breakpoint
ALTER TABLE "credit_card_billing_cycles" ALTER COLUMN "statement_amount" TYPE bigint USING "statement_amount"::bigint;--> statement-breakpoint
ALTER TABLE "credit_card_billing_cycles" ALTER COLUMN "paid_amount" TYPE bigint USING "paid_amount"::bigint;--> statement-breakpoint
ALTER TABLE "credit_card_billing_cycles" ALTER COLUMN "remaining_amount" TYPE bigint USING "remaining_amount"::bigint;--> statement-breakpoint
ALTER TABLE "credit_card_budget_recognitions" ALTER COLUMN "amount" TYPE bigint USING "amount"::bigint;--> statement-breakpoint
ALTER TABLE "credit_card_installments" ALTER COLUMN "amount" TYPE bigint USING "amount"::bigint;--> statement-breakpoint
ALTER TABLE "credit_card_payment_allocations" ALTER COLUMN "amount" TYPE bigint USING "amount"::bigint;--> statement-breakpoint
ALTER TABLE "credit_card_payments" ALTER COLUMN "amount" TYPE bigint USING "amount"::bigint;--> statement-breakpoint
ALTER TABLE "credit_card_purchases" ALTER COLUMN "purchase_amount" TYPE bigint USING "purchase_amount"::bigint;
