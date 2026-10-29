CREATE TABLE "import_batches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "household_id" uuid NOT NULL,
  "created_by_user_id" uuid NOT NULL,
  "status" varchar(16) DEFAULT 'draft' NOT NULL,
  "parser_id" varchar(64) NOT NULL,
  "source_kind" varchar(16) NOT NULL,
  "file_name" varchar(255) NOT NULL,
  "file_hash" varchar(64) NOT NULL,
  "file_size" integer NOT NULL,
  "institution" varchar(255),
  "source_account_ref" varchar(255),
  "currency_code" varchar(3),
  "period_start" date,
  "period_end" date,
  "statement_balance" bigint,
  "statement_balance_date" date,
  "warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "target_account_id" uuid,
  "target_credit_card_id" uuid,
  "row_count" integer DEFAULT 0 NOT NULL,
  "processed_count" integer DEFAULT 0 NOT NULL,
  "created_count" integer DEFAULT 0 NOT NULL,
  "duplicate_count" integer DEFAULT 0 NOT NULL,
  "skipped_count" integer DEFAULT 0 NOT NULL,
  "failed_count" integer DEFAULT 0 NOT NULL,
  "error_message" text,
  "started_at" timestamp,
  "finished_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_rows" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "batch_id" uuid NOT NULL,
  "row_index" integer NOT NULL,
  "posted_date" date,
  "amount" bigint,
  "description" text NOT NULL,
  "counterparty" text,
  "source_key" text NOT NULL,
  "external_id" text,
  "fingerprint" text,
  "series_key" text,
  "installment_number" integer,
  "installment_total" integer,
  "balance_after" bigint,
  "hints" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "raw" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "merchant_id" uuid,
  "category_id" uuid,
  "tag_ids" jsonb,
  "description_override" varchar(512),
  "skip" boolean DEFAULT false NOT NULL,
  "kind" varchar(24),
  "issues" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "outcome" varchar(16),
  "outcome_message" text,
  "created_transaction_id" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_mappings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "household_id" uuid NOT NULL,
  "source_key" text NOT NULL,
  "display_name" text NOT NULL,
  "target_type" varchar(16) DEFAULT 'none' NOT NULL,
  "merchant_id" uuid,
  "account_id" uuid,
  "credit_card_id" uuid,
  "category_id" uuid,
  "tag_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "household_id" uuid NOT NULL,
  "batch_id" uuid,
  "target_type" varchar(16) NOT NULL,
  "target_id" uuid NOT NULL,
  "external_id" text,
  "fingerprint" text,
  "series_key" text,
  "pair_key" text,
  "transaction_id" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_target_account_id_accounts_id_fk" FOREIGN KEY ("target_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_target_credit_card_id_credit_cards_id_fk" FOREIGN KEY ("target_credit_card_id") REFERENCES "public"."credit_cards"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_batch_id_import_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."import_batches"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "import_mappings" ADD CONSTRAINT "import_mappings_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "import_mappings" ADD CONSTRAINT "import_mappings_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "import_mappings" ADD CONSTRAINT "import_mappings_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "import_mappings" ADD CONSTRAINT "import_mappings_credit_card_id_credit_cards_id_fk" FOREIGN KEY ("credit_card_id") REFERENCES "public"."credit_cards"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "import_mappings" ADD CONSTRAINT "import_mappings_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "import_records" ADD CONSTRAINT "import_records_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "import_records" ADD CONSTRAINT "import_records_batch_id_import_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."import_batches"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "import_batches_household_idx" ON "import_batches" USING btree ("household_id","created_at");
--> statement-breakpoint
CREATE INDEX "import_batches_file_hash_idx" ON "import_batches" USING btree ("household_id","file_hash");
--> statement-breakpoint
CREATE UNIQUE INDEX "import_rows_batch_index_unique" ON "import_rows" USING btree ("batch_id","row_index");
--> statement-breakpoint
CREATE INDEX "import_rows_batch_outcome_idx" ON "import_rows" USING btree ("batch_id","outcome");
--> statement-breakpoint
CREATE UNIQUE INDEX "import_mappings_household_key_unique" ON "import_mappings" USING btree ("household_id","source_key");
--> statement-breakpoint
CREATE INDEX "import_records_target_idx" ON "import_records" USING btree ("household_id","target_type","target_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "import_records_external_unique" ON "import_records" USING btree ("household_id","target_type","target_id","external_id") WHERE "import_records"."external_id" is not null;
--> statement-breakpoint
CREATE UNIQUE INDEX "import_records_pair_unique" ON "import_records" USING btree ("household_id","pair_key") WHERE "import_records"."pair_key" is not null;
--> statement-breakpoint
CREATE INDEX "import_records_series_idx" ON "import_records" USING btree ("household_id","target_id","series_key");
--> statement-breakpoint
CREATE INDEX "import_records_fingerprint_idx" ON "import_records" USING btree ("household_id","target_id","fingerprint");
