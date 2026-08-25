CREATE TABLE "household_brandfetch_integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"encrypted_client_id" text NOT NULL,
	"last_checked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "household_brandfetch_integrations" ADD CONSTRAINT "household_brandfetch_integrations_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "household_brandfetch_integrations_household_unique" ON "household_brandfetch_integrations" USING btree ("household_id");
--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "domain" varchar(255);
--> statement-breakpoint
UPDATE "merchants"
SET "domain" = lower(
  regexp_replace(
    split_part(
      regexp_replace(coalesce("website", ''), '^https?://', ''),
      '/',
      1
    ),
    '^www\.',
    ''
  )
)
WHERE "website" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "merchants" DROP COLUMN "website";
