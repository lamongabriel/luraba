CREATE TYPE "public"."split_status" AS ENUM('active', 'closed');
--> statement-breakpoint
CREATE TABLE "splits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "household_id" uuid NOT NULL,
  "created_by_user_id" uuid NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "total_amount" bigint,
  "currency_code" varchar(3) NOT NULL,
  "status" "split_status" DEFAULT 'active' NOT NULL,
  "source_transaction_id" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "split_participants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "split_id" uuid NOT NULL,
  "name" varchar(120) NOT NULL,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "split_installments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "participant_id" uuid NOT NULL,
  "due_date" date NOT NULL,
  "grace_until" date,
  "expected_amount" bigint NOT NULL,
  "received_at" timestamp,
  "skipped_at" timestamp,
  "written_off_at" timestamp,
  "transaction_id" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "splits" ADD CONSTRAINT "splits_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "splits" ADD CONSTRAINT "splits_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "splits" ADD CONSTRAINT "splits_currency_code_currencies_code_fk" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "splits" ADD CONSTRAINT "splits_source_transaction_id_transactions_id_fk" FOREIGN KEY ("source_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "split_participants" ADD CONSTRAINT "split_participants_split_id_splits_id_fk" FOREIGN KEY ("split_id") REFERENCES "public"."splits"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "split_installments" ADD CONSTRAINT "split_installments_participant_id_split_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."split_participants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "split_installments" ADD CONSTRAINT "split_installments_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "splits_household_id_idx" ON "splits" USING btree ("household_id");
--> statement-breakpoint
CREATE INDEX "split_participants_split_id_idx" ON "split_participants" USING btree ("split_id");
--> statement-breakpoint
CREATE INDEX "split_installments_participant_id_idx" ON "split_installments" USING btree ("participant_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "split_installments_transaction_unique" ON "split_installments" USING btree ("transaction_id") WHERE "split_installments"."transaction_id" is not null;
