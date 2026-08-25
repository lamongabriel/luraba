ALTER TABLE "transaction_tags"
ADD COLUMN "position" integer;
--> statement-breakpoint
WITH ordered_tags AS (
  SELECT
    "transaction_id",
    "tag_id",
    ROW_NUMBER() OVER (
      PARTITION BY "transaction_id"
      ORDER BY "created_at" ASC, "tag_id" ASC
    ) - 1 AS "position"
  FROM "transaction_tags"
)
UPDATE "transaction_tags" AS tags
SET "position" = ordered_tags."position"
FROM ordered_tags
WHERE tags."transaction_id" = ordered_tags."transaction_id"
  AND tags."tag_id" = ordered_tags."tag_id";
--> statement-breakpoint
ALTER TABLE "transaction_tags"
ALTER COLUMN "position" SET DEFAULT 0,
ALTER COLUMN "position" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "transaction_tags_transaction_position_idx"
ON "transaction_tags" ("transaction_id", "position");
