-- Guard against dangling parent references before adding the FK constraint.
UPDATE "categories" c
SET "parent_id" = NULL
WHERE "parent_id" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "categories" p WHERE p.id = c."parent_id");--> statement-breakpoint

ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk"
  FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "categories_parent_id_idx" ON "categories" USING btree ("parent_id");
