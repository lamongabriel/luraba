ALTER TABLE "credit_cards" ADD COLUMN "credit_limit_amount" bigint NOT NULL DEFAULT -1;--> statement-breakpoint
ALTER TABLE "credit_cards" DROP COLUMN "unapplied_credit_amount";--> statement-breakpoint
