ALTER TABLE "transactions" ADD COLUMN "original_description" varchar(512);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "notes" text;
