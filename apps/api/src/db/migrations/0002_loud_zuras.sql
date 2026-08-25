CREATE TYPE "public"."credit_card_cycle_status" AS ENUM('open', 'closed', 'paid');--> statement-breakpoint
CREATE TYPE "public"."credit_card_product_type" AS ENUM('credit');--> statement-breakpoint
CREATE TYPE "public"."credit_expense_timing" AS ENUM('spend_month', 'payment_month');--> statement-breakpoint
CREATE TYPE "public"."credit_installment_budget_mode" AS ENUM('per_installment', 'full_amount');--> statement-breakpoint
ALTER TYPE "public"."account_type" ADD VALUE 'credit_card' BEFORE 'property';--> statement-breakpoint
CREATE TABLE "credit_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"brand" varchar(64) NOT NULL,
	"product_type" "credit_card_product_type" DEFAULT 'credit' NOT NULL,
	"last4" varchar(4) NOT NULL,
	"color" varchar(32),
	"closing_day" integer NOT NULL,
	"due_day" integer NOT NULL,
	"unapplied_credit_amount" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_card_billing_cycles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"credit_card_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"closing_date" date NOT NULL,
	"due_date" date NOT NULL,
	"status" "credit_card_cycle_status" DEFAULT 'open' NOT NULL,
	"statement_amount" integer DEFAULT 0 NOT NULL,
	"paid_amount" integer DEFAULT 0 NOT NULL,
	"remaining_amount" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_card_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"credit_card_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"purchase_amount" integer NOT NULL,
	"installment_count" integer NOT NULL,
	"budget_expense_timing" "credit_expense_timing" NOT NULL,
	"budget_installment_mode" "credit_installment_budget_mode" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_card_installments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"credit_card_id" uuid NOT NULL,
	"purchase_id" uuid NOT NULL,
	"billing_cycle_id" uuid NOT NULL,
	"installment_number" integer NOT NULL,
	"amount" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_card_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"credit_card_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_card_payment_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"billing_cycle_id" uuid,
	"amount" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_card_budget_recognitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_id" uuid NOT NULL,
	"installment_id" uuid,
	"category_id" uuid NOT NULL,
	"currency_id" varchar(3) NOT NULL,
	"budget_month" date NOT NULL,
	"amount" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "credit_expense_timing" "credit_expense_timing" DEFAULT 'spend_month' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "credit_installment_budget_mode" "credit_installment_budget_mode" DEFAULT 'per_installment' NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_cards" ADD CONSTRAINT "credit_cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_cards" ADD CONSTRAINT "credit_cards_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_card_billing_cycles" ADD CONSTRAINT "credit_card_billing_cycles_credit_card_id_credit_cards_id_fk" FOREIGN KEY ("credit_card_id") REFERENCES "public"."credit_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_card_purchases" ADD CONSTRAINT "credit_card_purchases_credit_card_id_credit_cards_id_fk" FOREIGN KEY ("credit_card_id") REFERENCES "public"."credit_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_card_purchases" ADD CONSTRAINT "credit_card_purchases_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_card_installments" ADD CONSTRAINT "credit_card_installments_credit_card_id_credit_cards_id_fk" FOREIGN KEY ("credit_card_id") REFERENCES "public"."credit_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_card_installments" ADD CONSTRAINT "credit_card_installments_purchase_id_credit_card_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."credit_card_purchases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_card_installments" ADD CONSTRAINT "credit_card_installments_billing_cycle_id_credit_card_billing_cycles_id_fk" FOREIGN KEY ("billing_cycle_id") REFERENCES "public"."credit_card_billing_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_card_payments" ADD CONSTRAINT "credit_card_payments_credit_card_id_credit_cards_id_fk" FOREIGN KEY ("credit_card_id") REFERENCES "public"."credit_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_card_payments" ADD CONSTRAINT "credit_card_payments_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_card_payment_allocations" ADD CONSTRAINT "credit_card_payment_allocations_payment_id_credit_card_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."credit_card_payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_card_payment_allocations" ADD CONSTRAINT "credit_card_payment_allocations_billing_cycle_id_credit_card_billing_cycles_id_fk" FOREIGN KEY ("billing_cycle_id") REFERENCES "public"."credit_card_billing_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_card_budget_recognitions" ADD CONSTRAINT "credit_card_budget_recognitions_purchase_id_credit_card_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."credit_card_purchases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_card_budget_recognitions" ADD CONSTRAINT "credit_card_budget_recognitions_installment_id_credit_card_installments_id_fk" FOREIGN KEY ("installment_id") REFERENCES "public"."credit_card_installments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_card_budget_recognitions" ADD CONSTRAINT "credit_card_budget_recognitions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_card_budget_recognitions" ADD CONSTRAINT "credit_card_budget_recognitions_currency_id_currencies_code_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "credit_cards_account_id_unique" ON "credit_cards" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_card_billing_cycles_card_period_start_unique" ON "credit_card_billing_cycles" USING btree ("credit_card_id","period_start");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_card_purchases_transaction_id_unique" ON "credit_card_purchases" USING btree ("transaction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_card_installments_purchase_number_unique" ON "credit_card_installments" USING btree ("purchase_id","installment_number");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_card_payments_transaction_id_unique" ON "credit_card_payments" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "credit_card_budget_recognitions_budget_month_idx" ON "credit_card_budget_recognitions" USING btree ("budget_month");