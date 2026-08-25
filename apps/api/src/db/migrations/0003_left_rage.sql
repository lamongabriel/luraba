CREATE TYPE "public"."household_invite_status" AS ENUM('pending', 'accepted', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."household_role" AS ENUM('owner', 'admin', 'member', 'viewer');--> statement-breakpoint
CREATE TABLE "households" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"default_currency_id" varchar(3) NOT NULL,
	"country_code" "country_code" DEFAULT 'BR' NOT NULL,
	"timezone" "preferred_timezone" DEFAULT 'America/Sao_Paulo' NOT NULL,
	"budget_month_starts_on" integer DEFAULT 1 NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "household_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "household_role" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "household_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" "household_role" NOT NULL,
	"status" "household_invite_status" DEFAULT 'pending' NOT NULL,
	"invited_by_user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"accepted_at" timestamp,
	"revoked_at" timestamp
);
--> statement-breakpoint
DROP INDEX "accounts_user_name_unique";--> statement-breakpoint
DROP INDEX "categories_user_name_unique";--> statement-breakpoint
DROP INDEX "tags_user_name_unique";--> statement-breakpoint
DROP INDEX "merchants_user_name_unique";--> statement-breakpoint
DROP INDEX "budgets_user_month_category_unique";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "default_household_id" uuid;--> statement-breakpoint
INSERT INTO "households" (
	"id",
	"name",
	"default_currency_id",
	"country_code",
	"timezone",
	"budget_month_starts_on",
	"created_by_user_id",
	"created_at",
	"updated_at"
)
SELECT
	gen_random_uuid(),
	u."name" || '''s Household',
	COALESCE(
		(SELECT c."code" FROM "currencies" c WHERE c."code" = u."preferred_currency"::text),
		(SELECT c."code" FROM "currencies" c WHERE c."code" = 'BRL'),
		u."preferred_currency"::text
	),
	u."country_code",
	u."preferred_timezone",
	u."budget_month_starts_on",
	u."id",
	now(),
	now()
FROM "users" u
WHERE u."default_household_id" IS NULL;--> statement-breakpoint
UPDATE "users" u
SET "default_household_id" = h."id"
FROM "households" h
WHERE h."created_by_user_id" = u."id"
	AND u."default_household_id" IS NULL;--> statement-breakpoint
INSERT INTO "household_members" (
	"household_id",
	"user_id",
	"role",
	"created_at",
	"updated_at"
)
SELECT
	u."default_household_id",
	u."id",
	'owner'::"household_role",
	now(),
	now()
FROM "users" u
WHERE u."default_household_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "household_id" uuid;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "household_id" uuid;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "household_id" uuid;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "household_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "household_id" uuid;--> statement-breakpoint
ALTER TABLE "budgets" ADD COLUMN "household_id" uuid;--> statement-breakpoint
ALTER TABLE "credit_cards" ADD COLUMN "household_id" uuid;--> statement-breakpoint
UPDATE "accounts" a
SET "household_id" = u."default_household_id"
FROM "users" u
WHERE a."user_id" = u."id"
	AND a."household_id" IS NULL;--> statement-breakpoint
UPDATE "categories" c
SET "household_id" = u."default_household_id"
FROM "users" u
WHERE c."user_id" = u."id"
	AND c."household_id" IS NULL;--> statement-breakpoint
UPDATE "tags" t
SET "household_id" = u."default_household_id"
FROM "users" u
WHERE t."user_id" = u."id"
	AND t."household_id" IS NULL;--> statement-breakpoint
UPDATE "merchants" m
SET "household_id" = u."default_household_id"
FROM "users" u
WHERE m."user_id" = u."id"
	AND m."household_id" IS NULL;--> statement-breakpoint
UPDATE "transactions" t
SET "household_id" = u."default_household_id"
FROM "users" u
WHERE t."user_id" = u."id"
	AND t."household_id" IS NULL;--> statement-breakpoint
UPDATE "budgets" b
SET "household_id" = u."default_household_id"
FROM "users" u
WHERE b."user_id" = u."id"
	AND b."household_id" IS NULL;--> statement-breakpoint
UPDATE "credit_cards" c
SET "household_id" = u."default_household_id"
FROM "users" u
WHERE c."user_id" = u."id"
	AND c."household_id" IS NULL;--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "household_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "household_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tags" ALTER COLUMN "household_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "merchants" ALTER COLUMN "household_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "household_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "budgets" ALTER COLUMN "household_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_cards" ALTER COLUMN "household_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "households" ADD CONSTRAINT "households_default_currency_id_currencies_code_fk" FOREIGN KEY ("default_currency_id") REFERENCES "public"."currencies"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "households" ADD CONSTRAINT "households_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_invites" ADD CONSTRAINT "household_invites_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_invites" ADD CONSTRAINT "household_invites_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_cards" ADD CONSTRAINT "credit_cards_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "household_members_household_user_unique" ON "household_members" USING btree ("household_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "household_invites_pending_email_unique" ON "household_invites" USING btree ("household_id","email") WHERE "household_invites"."status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_household_name_unique" ON "accounts" USING btree ("household_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_household_name_unique" ON "categories" USING btree ("household_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_household_name_unique" ON "tags" USING btree ("household_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "merchants_household_name_unique" ON "merchants" USING btree ("household_id","name");--> statement-breakpoint
CREATE INDEX "transactions_household_id_idx" ON "transactions" USING btree ("household_id");--> statement-breakpoint
CREATE UNIQUE INDEX "budgets_household_month_category_unique" ON "budgets" USING btree ("household_id","month","category_id");
