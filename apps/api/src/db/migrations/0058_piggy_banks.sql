-- 0058_piggy_banks
-- Piggy banks (Nubank Caixinhas style): savings buckets inside one real account, with daily
-- interest accrual and goal links. Schema only: no existing data is touched (see docs/piggy-banks.md
-- for the idempotent "adopt" script that creates the Unallocated piggy bank).
CREATE TABLE "piggy_banks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"parent_account_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"cover_upload_id" uuid,
	"cover_preset" varchar(32),
	"emoji" varchar(16),
	"color" varchar(7),
	"currency_code" varchar(3) NOT NULL,
	"yield_type" varchar(16) DEFAULT 'none' NOT NULL,
	"yield_rate" numeric(12, 6) DEFAULT '0' NOT NULL,
	"day_count" integer DEFAULT 365 NOT NULL,
	"maturity_date" date,
	"liquidity" varchar(16) DEFAULT 'daily' NOT NULL,
	"tax_regime" varchar(16) DEFAULT 'none' NOT NULL,
	"apply_iof" boolean DEFAULT false NOT NULL,
	"is_unallocated" boolean DEFAULT false NOT NULL,
	"accrued_through" date,
	"created_by_user_id" uuid,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "piggy_banks_yield_type_check" CHECK ("yield_type" in ('cdi_percent', 'selic_percent', 'ipca_plus', 'fixed_rate', 'none')),
	CONSTRAINT "piggy_banks_day_count_check" CHECK ("day_count" in (252, 365)),
	CONSTRAINT "piggy_banks_liquidity_check" CHECK ("liquidity" in ('daily', 'at_maturity')),
	CONSTRAINT "piggy_banks_tax_regime_check" CHECK ("tax_regime" in ('none', 'regressive_ir'))
);
--> statement-breakpoint
CREATE TABLE "piggy_bank_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"piggy_bank_id" uuid NOT NULL,
	"kind" varchar(16) NOT NULL,
	"amount" bigint NOT NULL,
	"occurred_on" date NOT NULL,
	"transaction_id" uuid,
	"group_id" uuid,
	"counterpart_piggy_bank_id" uuid,
	"estimated" boolean DEFAULT false NOT NULL,
	"note" text,
	"created_by_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "piggy_bank_movements_kind_check" CHECK ("kind" in ('opening', 'deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'interest', 'adjustment')),
	CONSTRAINT "piggy_bank_movements_amount_check" CHECK ("amount" <> 0)
);
--> statement-breakpoint
CREATE TABLE "piggy_bank_accruals" (
	"piggy_bank_id" uuid NOT NULL,
	"accrual_date" date NOT NULL,
	"opening_balance" bigint NOT NULL,
	"exact_amount" numeric(38, 12) NOT NULL,
	"posted_amount" bigint NOT NULL,
	"carry_out" numeric(38, 12) NOT NULL,
	"factor" numeric(30, 16) NOT NULL,
	"estimated" boolean DEFAULT false NOT NULL,
	"movement_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "piggy_bank_accruals_piggy_bank_id_accrual_date_pk" PRIMARY KEY("piggy_bank_id","accrual_date")
);
--> statement-breakpoint
CREATE TABLE "goal_piggy_banks" (
	"goal_id" uuid NOT NULL,
	"piggy_bank_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "goal_piggy_banks_goal_id_piggy_bank_id_pk" PRIMARY KEY("goal_id","piggy_bank_id")
);
--> statement-breakpoint
ALTER TABLE "piggy_banks" ADD CONSTRAINT "piggy_banks_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "piggy_banks" ADD CONSTRAINT "piggy_banks_parent_account_id_accounts_id_fk" FOREIGN KEY ("parent_account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "piggy_banks" ADD CONSTRAINT "piggy_banks_cover_upload_id_uploads_id_fk" FOREIGN KEY ("cover_upload_id") REFERENCES "public"."uploads"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "piggy_banks" ADD CONSTRAINT "piggy_banks_currency_code_currencies_code_fk" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "piggy_banks" ADD CONSTRAINT "piggy_banks_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "piggy_bank_movements" ADD CONSTRAINT "piggy_bank_movements_piggy_bank_id_piggy_banks_id_fk" FOREIGN KEY ("piggy_bank_id") REFERENCES "public"."piggy_banks"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "piggy_bank_movements" ADD CONSTRAINT "piggy_bank_movements_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "piggy_bank_movements" ADD CONSTRAINT "piggy_bank_movements_counterpart_piggy_bank_id_piggy_banks_id_fk" FOREIGN KEY ("counterpart_piggy_bank_id") REFERENCES "public"."piggy_banks"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "piggy_bank_movements" ADD CONSTRAINT "piggy_bank_movements_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "piggy_bank_accruals" ADD CONSTRAINT "piggy_bank_accruals_piggy_bank_id_piggy_banks_id_fk" FOREIGN KEY ("piggy_bank_id") REFERENCES "public"."piggy_banks"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "piggy_bank_accruals" ADD CONSTRAINT "piggy_bank_accruals_movement_id_piggy_bank_movements_id_fk" FOREIGN KEY ("movement_id") REFERENCES "public"."piggy_bank_movements"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "goal_piggy_banks" ADD CONSTRAINT "goal_piggy_banks_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "goal_piggy_banks" ADD CONSTRAINT "goal_piggy_banks_piggy_bank_id_piggy_banks_id_fk" FOREIGN KEY ("piggy_bank_id") REFERENCES "public"."piggy_banks"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "piggy_banks_household_id_idx" ON "piggy_banks" USING btree ("household_id");
--> statement-breakpoint
CREATE INDEX "piggy_banks_parent_account_id_idx" ON "piggy_banks" USING btree ("parent_account_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "piggy_banks_parent_title_unique" ON "piggy_banks" USING btree ("parent_account_id","title");
--> statement-breakpoint
CREATE INDEX "piggy_bank_movements_piggy_bank_idx" ON "piggy_bank_movements" USING btree ("piggy_bank_id","occurred_on");
--> statement-breakpoint
CREATE INDEX "piggy_bank_movements_transaction_idx" ON "piggy_bank_movements" USING btree ("transaction_id");
--> statement-breakpoint
CREATE INDEX "piggy_bank_movements_group_idx" ON "piggy_bank_movements" USING btree ("group_id");
--> statement-breakpoint
CREATE INDEX "goal_piggy_banks_piggy_bank_idx" ON "goal_piggy_banks" USING btree ("piggy_bank_id");
