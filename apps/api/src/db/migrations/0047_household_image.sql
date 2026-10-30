ALTER TABLE "households" ADD COLUMN "image_upload_id" uuid;
--> statement-breakpoint
ALTER TABLE "households" ADD CONSTRAINT "households_image_upload_id_uploads_id_fk" FOREIGN KEY ("image_upload_id") REFERENCES "public"."uploads"("id") ON DELETE set null ON UPDATE no action;
