-- 0060_card_statements
-- Card invoices match the issuer to the cent: statement imports, installment audit trail, reconciled invoices
-- and the rounding pattern learned per card.
ALTER TABLE "credit_card_billing_cycles" ADD COLUMN "reconciled_at" timestamp;
--> statement-breakpoint
ALTER TABLE "credit_card_billing_cycles" ADD COLUMN "issuer_total" bigint;
--> statement-breakpoint
CREATE TABLE "card_statement_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"credit_card_id" uuid NOT NULL,
	"billing_cycle_id" uuid NOT NULL,
	"issuer" varchar(32) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"issuer_total" bigint NOT NULL,
	"matched_count" integer DEFAULT 0 NOT NULL,
	"corrected_count" integer DEFAULT 0 NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"missing_count" integer DEFAULT 0 NOT NULL,
	"extra_count" integer DEFAULT 0 NOT NULL,
	"reconciled" boolean DEFAULT false NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "card_statement_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"import_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"line_date" date,
	"description" text NOT NULL,
	"amount" bigint NOT NULL,
	"kind" varchar(16) NOT NULL,
	"installment_number" integer,
	"installment_total" integer,
	"status" varchar(16) NOT NULL,
	"installment_id" uuid,
	"difference" bigint
);
--> statement-breakpoint
CREATE TABLE "card_installment_audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"credit_card_id" uuid NOT NULL,
	"purchase_id" uuid NOT NULL,
	"installment_id" uuid,
	"billing_cycle_id" uuid,
	"installment_number" integer NOT NULL,
	"previous_amount" bigint NOT NULL,
	"new_amount" bigint NOT NULL,
	"source" varchar(16) NOT NULL,
	"statement_import_id" uuid,
	"note" text NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "card_rounding_patterns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"credit_card_id" uuid NOT NULL,
	"merchant_key" varchar(36) DEFAULT '' NOT NULL,
	"pattern" varchar(16) NOT NULL,
	"rounding_mode" varchar(24),
	"samples" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "card_statement_imports" ADD CONSTRAINT "card_statement_imports_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "card_statement_imports" ADD CONSTRAINT "card_statement_imports_credit_card_id_credit_cards_id_fk" FOREIGN KEY ("credit_card_id") REFERENCES "public"."credit_cards"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "card_statement_imports" ADD CONSTRAINT "card_statement_imports_billing_cycle_id_credit_card_billing_cycles_id_fk" FOREIGN KEY ("billing_cycle_id") REFERENCES "public"."credit_card_billing_cycles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "card_statement_imports" ADD CONSTRAINT "card_statement_imports_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "card_statement_lines" ADD CONSTRAINT "card_statement_lines_import_id_card_statement_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."card_statement_imports"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "card_statement_lines" ADD CONSTRAINT "card_statement_lines_installment_id_credit_card_installments_id_fk" FOREIGN KEY ("installment_id") REFERENCES "public"."credit_card_installments"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "card_installment_audits" ADD CONSTRAINT "card_installment_audits_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "card_installment_audits" ADD CONSTRAINT "card_installment_audits_credit_card_id_credit_cards_id_fk" FOREIGN KEY ("credit_card_id") REFERENCES "public"."credit_cards"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "card_installment_audits" ADD CONSTRAINT "card_installment_audits_purchase_id_credit_card_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."credit_card_purchases"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "card_installment_audits" ADD CONSTRAINT "card_installment_audits_installment_id_credit_card_installments_id_fk" FOREIGN KEY ("installment_id") REFERENCES "public"."credit_card_installments"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "card_installment_audits" ADD CONSTRAINT "card_installment_audits_billing_cycle_id_credit_card_billing_cycles_id_fk" FOREIGN KEY ("billing_cycle_id") REFERENCES "public"."credit_card_billing_cycles"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "card_installment_audits" ADD CONSTRAINT "card_installment_audits_statement_import_id_card_statement_imports_id_fk" FOREIGN KEY ("statement_import_id") REFERENCES "public"."card_statement_imports"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "card_installment_audits" ADD CONSTRAINT "card_installment_audits_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "card_rounding_patterns" ADD CONSTRAINT "card_rounding_patterns_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "card_rounding_patterns" ADD CONSTRAINT "card_rounding_patterns_credit_card_id_credit_cards_id_fk" FOREIGN KEY ("credit_card_id") REFERENCES "public"."credit_cards"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "card_statement_imports_card_idx" ON "card_statement_imports" USING btree ("credit_card_id","created_at");
--> statement-breakpoint
CREATE INDEX "card_statement_imports_cycle_idx" ON "card_statement_imports" USING btree ("billing_cycle_id");
--> statement-breakpoint
CREATE INDEX "card_statement_lines_import_idx" ON "card_statement_lines" USING btree ("import_id","position");
--> statement-breakpoint
CREATE INDEX "card_installment_audits_purchase_idx" ON "card_installment_audits" USING btree ("purchase_id","created_at");
--> statement-breakpoint
CREATE INDEX "card_installment_audits_cycle_idx" ON "card_installment_audits" USING btree ("billing_cycle_id","created_at");
--> statement-breakpoint
CREATE INDEX "card_installment_audits_card_idx" ON "card_installment_audits" USING btree ("credit_card_id","created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "card_rounding_patterns_scope_unique" ON "card_rounding_patterns" USING btree ("credit_card_id","merchant_key");
--> statement-breakpoint
CREATE INDEX "card_rounding_patterns_household_idx" ON "card_rounding_patterns" USING btree ("household_id");
