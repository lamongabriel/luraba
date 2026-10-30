ALTER TABLE "import_batches" ADD COLUMN "format" varchar(16) DEFAULT 'statement' NOT NULL;--> statement-breakpoint
ALTER TABLE "import_batches" ADD COLUMN "raw_table" jsonb;--> statement-breakpoint
ALTER TABLE "import_batches" ADD COLUMN "column_mapping" jsonb;--> statement-breakpoint
CREATE TABLE "import_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "household_id" uuid NOT NULL,
  "target_type" varchar(16) NOT NULL,
  "target_id" uuid NOT NULL,
  "header_signature" text NOT NULL,
  "mapping" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "import_templates" ADD CONSTRAINT "import_templates_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "import_templates_target_unique" ON "import_templates" USING btree ("household_id","target_type","target_id");
