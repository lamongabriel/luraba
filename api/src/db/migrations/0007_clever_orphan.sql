ALTER TABLE "exchange_rates" ADD COLUMN "provider" varchar(64) DEFAULT 'frankfurter' NOT NULL;--> statement-breakpoint
DROP INDEX "exchange_rates_pair_date_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "exchange_rates_pair_date_unique" ON "exchange_rates" USING btree ("provider","from_currency_id","to_currency_id","rate_date");--> statement-breakpoint

ALTER TABLE "budgets" DROP COLUMN "currency_id";--> statement-breakpoint

ALTER TABLE "users" ALTER COLUMN "preferred_currency" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "preferred_currency" TYPE varchar(3) USING "preferred_currency"::text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "preferred_currency" SET DEFAULT 'BRL';--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_preferred_currency_currencies_code_fk" FOREIGN KEY ("preferred_currency") REFERENCES "public"."currencies"("code") ON DELETE restrict ON UPDATE no action;
