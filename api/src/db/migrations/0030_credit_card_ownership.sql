--> statement-breakpoint
ALTER TABLE "credit_cards" RENAME COLUMN "account_id" TO "ledger_account_id";
--> statement-breakpoint
ALTER TABLE "credit_cards" ADD COLUMN "name" varchar(255);
--> statement-breakpoint
UPDATE "credit_cards" cards
SET "name" = accounts."name"
FROM "accounts" accounts
WHERE accounts."id" = cards."ledger_account_id";
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "credit_cards" WHERE "name" IS NULL) THEN
    RAISE EXCEPTION 'Credit-card migration could not derive card names from ledger accounts';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "credit_cards" ALTER COLUMN "name" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "credit_cards" ADD COLUMN "institution_name" varchar(255);
--> statement-breakpoint
ALTER TABLE "credit_cards" ADD COLUMN "institution_domain" varchar(255);
--> statement-breakpoint
ALTER TABLE "credit_cards" ADD COLUMN "institution_logo_url" varchar(1024);
--> statement-breakpoint
ALTER TABLE "credit_cards" ADD COLUMN "notes" varchar(4000);
--> statement-breakpoint
ALTER TABLE "credit_cards" ADD COLUMN "owner_account_id" uuid;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "credit_cards") THEN
    RAISE EXCEPTION 'Credit-card ownership migration requires resetting the local database before applying migration 0030 because owner accounts cannot be inferred';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "credit_cards" ALTER COLUMN "owner_account_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "credit_cards"
  ADD CONSTRAINT "credit_cards_owner_account_id_accounts_id_fk"
  FOREIGN KEY ("owner_account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "credit_cards"
  RENAME CONSTRAINT "credit_cards_account_id_accounts_id_fk"
  TO "credit_cards_ledger_account_id_accounts_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "credit_cards_account_id_unique";
--> statement-breakpoint
CREATE INDEX "credit_cards_owner_account_id_idx" ON "credit_cards" USING btree ("owner_account_id");
--> statement-breakpoint
CREATE INDEX "credit_cards_ledger_account_id_idx" ON "credit_cards" USING btree ("ledger_account_id");
--> statement-breakpoint
CREATE INDEX "credit_cards_household_name_idx" ON "credit_cards" USING btree ("household_id", "name");
