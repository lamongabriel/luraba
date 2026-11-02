ALTER TABLE "goals" ADD COLUMN "end_month" date;
--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD COLUMN "kind" varchar(16) DEFAULT 'contribution' NOT NULL;
--> statement-breakpoint
UPDATE "goal_contributions" SET "kind" = 'withdrawal' WHERE "amount" < 0;
--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD COLUMN "from_account_id" uuid;
--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD COLUMN "to_account_id" uuid;
--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD COLUMN "original_amount" bigint;
--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD COLUMN "original_currency" varchar(3);
--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD COLUMN "fx_rate" numeric(24, 10);
--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_from_account_id_accounts_id_fk" FOREIGN KEY ("from_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_to_account_id_accounts_id_fk" FOREIGN KEY ("to_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "competency_month" date;
--> statement-breakpoint
CREATE TABLE "monthly_plan_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"month" date NOT NULL,
	"kind" varchar(16) NOT NULL,
	"goal_id" uuid,
	"amount" bigint NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "monthly_plan_lines" ADD CONSTRAINT "monthly_plan_lines_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "monthly_plan_lines" ADD CONSTRAINT "monthly_plan_lines_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "monthly_plan_lines" ADD CONSTRAINT "monthly_plan_lines_currency_code_currencies_code_fk" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "monthly_plan_lines_household_month_idx" ON "monthly_plan_lines" USING btree ("household_id","month");
