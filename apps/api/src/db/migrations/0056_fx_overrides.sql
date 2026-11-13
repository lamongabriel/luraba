CREATE TABLE "household_fx_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"from_currency_id" varchar(3) NOT NULL,
	"to_currency_id" varchar(3) NOT NULL,
	"rate_numerator" bigint NOT NULL,
	"rate_denominator" bigint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "household_fx_overrides" ADD CONSTRAINT "household_fx_overrides_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "household_fx_overrides" ADD CONSTRAINT "household_fx_overrides_from_currency_id_currencies_code_fk" FOREIGN KEY ("from_currency_id") REFERENCES "public"."currencies"("code") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "household_fx_overrides" ADD CONSTRAINT "household_fx_overrides_to_currency_id_currencies_code_fk" FOREIGN KEY ("to_currency_id") REFERENCES "public"."currencies"("code") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "household_fx_overrides_pair_unique" ON "household_fx_overrides" USING btree ("household_id","from_currency_id","to_currency_id");
