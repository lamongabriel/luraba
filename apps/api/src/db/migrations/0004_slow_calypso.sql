ALTER TABLE "accounts" DROP CONSTRAINT "accounts_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "categories" DROP CONSTRAINT "categories_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "tags" DROP CONSTRAINT "tags_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "merchants" DROP CONSTRAINT "merchants_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "budgets" DROP CONSTRAINT "budgets_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "credit_cards" DROP CONSTRAINT "credit_cards_user_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "transactions_user_id_idx";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "categories" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "tags" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "merchants" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "budgets" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "credit_cards" DROP COLUMN "user_id";