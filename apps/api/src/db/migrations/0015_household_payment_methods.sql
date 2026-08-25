ALTER TABLE "payment_methods" ADD COLUMN "household_id" uuid;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD COLUMN "translation_key" varchar(128);--> statement-breakpoint
ALTER TABLE "payment_methods" ADD COLUMN "color" varchar(16);--> statement-breakpoint
ALTER TABLE "payment_methods" ADD COLUMN "icon" varchar(128);--> statement-breakpoint
ALTER TABLE "payment_methods" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "payment_methods" SET "translation_key" = 'paymentMethods.system.' || "code";--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
DROP INDEX IF EXISTS "payment_methods_global_code_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "payment_methods_currency_code_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "payment_methods_system_global_code_unique" ON "payment_methods" USING btree ("code") WHERE "payment_methods"."household_id" is null and "payment_methods"."currency_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_methods_system_currency_code_unique" ON "payment_methods" USING btree ("code","currency_id") WHERE "payment_methods"."household_id" is null and "payment_methods"."currency_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_methods_household_global_code_unique" ON "payment_methods" USING btree ("household_id","code") WHERE "payment_methods"."household_id" is not null and "payment_methods"."currency_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_methods_household_currency_code_unique" ON "payment_methods" USING btree ("household_id","code","currency_id") WHERE "payment_methods"."household_id" is not null and "payment_methods"."currency_id" is not null;
