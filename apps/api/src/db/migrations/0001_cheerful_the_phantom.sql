DROP INDEX "payment_methods_global_code_unique";--> statement-breakpoint
DROP INDEX "payment_methods_currency_code_unique";--> statement-breakpoint
ALTER TABLE "entries" ALTER COLUMN "amount" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "budgets" ALTER COLUMN "amount" SET DATA TYPE integer;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_methods_global_code_unique" ON "payment_methods" USING btree ("code") WHERE "payment_methods"."currency_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_methods_currency_code_unique" ON "payment_methods" USING btree ("code","currency_id") WHERE "payment_methods"."currency_id" is not null;