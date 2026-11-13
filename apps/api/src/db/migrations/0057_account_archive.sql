-- 0057_account_archive
-- Archiving retires an account or credit card without deleting its history.
ALTER TABLE "accounts" ADD COLUMN "archived_at" timestamp;
--> statement-breakpoint
ALTER TABLE "credit_cards" ADD COLUMN "archived_at" timestamp;
