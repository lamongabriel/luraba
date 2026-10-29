CREATE TYPE "public"."goal_kind" AS ENUM('savings', 'investment');
--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('active', 'paused', 'canceled');
--> statement-breakpoint
CREATE TABLE "goals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "household_id" uuid NOT NULL,
  "created_by_user_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "kind" "goal_kind" DEFAULT 'savings' NOT NULL,
  "target_amount" bigint NOT NULL,
  "currency_code" varchar(3) NOT NULL,
  "start_date" date NOT NULL,
  "target_date" date,
  "monthly_contribution" bigint,
  "expected_return_bps" integer,
  "account_id" uuid,
  "status" "goal_status" DEFAULT 'active' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goal_contributions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "goal_id" uuid NOT NULL,
  "created_by_user_id" uuid NOT NULL,
  "amount" bigint NOT NULL,
  "contributed_on" date NOT NULL,
  "note" text,
  "transaction_id" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_currency_code_currencies_code_fk" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "goals_household_id_idx" ON "goals" USING btree ("household_id");
--> statement-breakpoint
CREATE INDEX "goals_household_status_idx" ON "goals" USING btree ("household_id","status");
--> statement-breakpoint
CREATE INDEX "goal_contributions_goal_id_idx" ON "goal_contributions" USING btree ("goal_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "goal_contributions_transaction_unique" ON "goal_contributions" USING btree ("transaction_id") WHERE "goal_contributions"."transaction_id" is not null;
