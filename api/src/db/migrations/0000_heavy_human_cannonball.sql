CREATE TYPE "public"."account_classification" AS ENUM('asset', 'liability');--> statement-breakpoint
CREATE TYPE "public"."account_type" AS ENUM('depository', 'loan', 'property', 'vehicle', 'other_asset', 'other_liability');--> statement-breakpoint
CREATE TYPE "public"."category_type" AS ENUM('expense', 'income');--> statement-breakpoint
CREATE TYPE "public"."country_code" AS ENUM('BR', 'US');--> statement-breakpoint
CREATE TYPE "public"."default_account_order" AS ENUM('name_asc', 'name_desc', 'newest', 'oldest');--> statement-breakpoint
CREATE TYPE "public"."default_period" AS ENUM('last_day', 'current_week', 'last_7_days', 'current_month', 'last_month', 'last_30_days', 'last_90_days', 'current_year', 'last_365_days', 'last_5_years', 'last_10_years', 'all_time');--> statement-breakpoint
CREATE TYPE "public"."ledger_classification" AS ENUM('asset', 'liability');--> statement-breakpoint
CREATE TYPE "public"."ledger_owner_type" AS ENUM('account', 'system');--> statement-breakpoint
CREATE TYPE "public"."preferred_currency" AS ENUM('BRL', 'USD', 'EUR');--> statement-breakpoint
CREATE TYPE "public"."preferred_date_format" AS ENUM('DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD');--> statement-breakpoint
CREATE TYPE "public"."preferred_language" AS ENUM('en', 'pt-BR');--> statement-breakpoint
CREATE TYPE "public"."preferred_timezone" AS ENUM('America/Sao_Paulo', 'UTC');--> statement-breakpoint
CREATE TYPE "public"."theme_preference" AS ENUM('light', 'dark', 'system');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('expense', 'income', 'transfer', 'adjustment');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"preferred_language" "preferred_language" DEFAULT 'en' NOT NULL,
	"preferred_currency" "preferred_currency" DEFAULT 'BRL' NOT NULL,
	"preferred_timezone" "preferred_timezone" DEFAULT 'America/Sao_Paulo' NOT NULL,
	"preferred_date_format" "preferred_date_format" DEFAULT 'DD/MM/YYYY' NOT NULL,
	"default_period" "default_period" DEFAULT 'current_month' NOT NULL,
	"default_account_order" "default_account_order" DEFAULT 'name_asc' NOT NULL,
	"country_code" "country_code" DEFAULT 'BR' NOT NULL,
	"budget_month_starts_on" integer DEFAULT 1 NOT NULL,
	"theme_preference" "theme_preference" DEFAULT 'system' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "currencies" (
	"code" varchar(3) PRIMARY KEY NOT NULL,
	"symbol" varchar(8) NOT NULL,
	"precision" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_currency_id" varchar(3) NOT NULL,
	"to_currency_id" varchar(3) NOT NULL,
	"rate_numerator" integer NOT NULL,
	"rate_denominator" integer NOT NULL,
	"rate_date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"institution_name" varchar(255),
	"institution_domain" varchar(255),
	"notes" text,
	"classification" "account_classification" NOT NULL,
	"type" "account_type" NOT NULL,
	"currency_id" varchar(3) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"classification" "ledger_classification" NOT NULL,
	"owner_type" "ledger_owner_type" NOT NULL,
	"owner_id" uuid NOT NULL,
	"currency_id" varchar(3) NOT NULL,
	"system_key" varchar(128),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"parent_id" uuid,
	"type" "category_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(64) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"website" varchar(255),
	"logo_url" varchar(512),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "transaction_type" NOT NULL,
	"payment_method_id" uuid,
	"category_id" uuid,
	"description" varchar(512) NOT NULL,
	"include_in_budget" boolean DEFAULT true NOT NULL,
	"merchant_id" uuid,
	"purchase_date" date NOT NULL,
	"posted_date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"ledger_account_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"currency_id" varchar(3) NOT NULL,
	"category_id" uuid,
	"budget_month" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "entries_non_zero_amount_check" CHECK ("entries"."amount" <> 0)
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"month" date NOT NULL,
	"category_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"currency_id" varchar(3) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_tags" (
	"transaction_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "transaction_tags_pk" PRIMARY KEY("transaction_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(32) NOT NULL,
	"name" varchar(64) NOT NULL,
	"currency_id" varchar(3)
);
--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_from_currency_id_currencies_code_fk" FOREIGN KEY ("from_currency_id") REFERENCES "public"."currencies"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_to_currency_id_currencies_code_fk" FOREIGN KEY ("to_currency_id") REFERENCES "public"."currencies"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_currency_id_currencies_code_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_accounts" ADD CONSTRAINT "ledger_accounts_currency_id_currencies_code_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_payment_method_id_payment_methods_id_fk" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_ledger_account_id_ledger_accounts_id_fk" FOREIGN KEY ("ledger_account_id") REFERENCES "public"."ledger_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_currency_id_currencies_code_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_currency_id_currencies_code_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_currency_id_currencies_code_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "exchange_rates_pair_date_unique" ON "exchange_rates" USING btree ("from_currency_id","to_currency_id","rate_date");--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_user_name_unique" ON "accounts" USING btree ("user_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_accounts_owner_unique" ON "ledger_accounts" USING btree ("owner_type","owner_id") WHERE "ledger_accounts"."owner_type" <> 'system';--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_accounts_system_key_unique" ON "ledger_accounts" USING btree ("system_key");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_user_name_unique" ON "categories" USING btree ("user_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_user_name_unique" ON "tags" USING btree ("user_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "merchants_user_name_unique" ON "merchants" USING btree ("user_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_methods_global_code_unique" ON "payment_methods" USING btree ("code") WHERE "payment_methods"."currency_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_methods_currency_code_unique" ON "payment_methods" USING btree ("code","currency_id") WHERE "payment_methods"."currency_id" is not null;--> statement-breakpoint
CREATE INDEX "transactions_user_id_idx" ON "transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transactions_payment_method_id_idx" ON "transactions" USING btree ("payment_method_id");--> statement-breakpoint
CREATE INDEX "transactions_posted_date_idx" ON "transactions" USING btree ("posted_date");--> statement-breakpoint
CREATE INDEX "transactions_purchase_date_idx" ON "transactions" USING btree ("purchase_date");--> statement-breakpoint
CREATE INDEX "entries_transaction_id_idx" ON "entries" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "entries_ledger_account_id_idx" ON "entries" USING btree ("ledger_account_id");--> statement-breakpoint
CREATE INDEX "entries_budget_month_idx" ON "entries" USING btree ("budget_month");--> statement-breakpoint
CREATE UNIQUE INDEX "budgets_user_month_category_unique" ON "budgets" USING btree ("user_id","month","category_id");
