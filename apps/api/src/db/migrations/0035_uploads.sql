CREATE TYPE "public"."upload_scope" AS ENUM('user', 'household');
--> statement-breakpoint
CREATE TYPE "public"."upload_kind" AS ENUM('image', 'pdf', 'document', 'text', 'other');
--> statement-breakpoint
CREATE TABLE "uploads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "scope" "upload_scope" NOT NULL,
  "household_id" uuid,
  "uploaded_by_user_id" uuid NOT NULL,
  "storage_key" varchar(512) NOT NULL,
  "filename" varchar(255) NOT NULL,
  "content_type" varchar(255) NOT NULL,
  "kind" "upload_kind" NOT NULL,
  "size_bytes" bigint NOT NULL,
  "sha256" varchar(64) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attachments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "upload_id" uuid NOT NULL,
  "target_type" varchar(32) NOT NULL,
  "target_id" uuid NOT NULL,
  "role" varchar(32) NOT NULL,
  "position" integer DEFAULT 0 NOT NULL,
  "created_by_user_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_upload_id_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."uploads"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_scope_household_check" CHECK (("scope" = 'user' AND "household_id" IS NULL) OR ("scope" = 'household' AND "household_id" IS NOT NULL));
--> statement-breakpoint
CREATE UNIQUE INDEX "uploads_storage_key_unique" ON "uploads" USING btree ("storage_key");
--> statement-breakpoint
CREATE INDEX "uploads_household_created_idx" ON "uploads" USING btree ("household_id","created_at");
--> statement-breakpoint
CREATE INDEX "uploads_uploaded_by_idx" ON "uploads" USING btree ("uploaded_by_user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "attachments_upload_target_role_unique" ON "attachments" USING btree ("upload_id","target_type","target_id","role");
--> statement-breakpoint
CREATE INDEX "attachments_target_idx" ON "attachments" USING btree ("target_type","target_id");
