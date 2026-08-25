ALTER TABLE "household_invites" DROP CONSTRAINT IF EXISTS "household_invites_pending_email_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "household_invites_pending_email_unique";--> statement-breakpoint
ALTER TABLE "household_invites" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TYPE "public"."household_invite_status" RENAME TO "household_invite_status_old";--> statement-breakpoint
CREATE TYPE "public"."household_invite_status" AS ENUM('pending', 'accepted', 'rejected', 'canceled');--> statement-breakpoint
ALTER TABLE "household_invites"
  ALTER COLUMN "status" TYPE "public"."household_invite_status"
  USING (
    CASE
      WHEN "status"::text = 'revoked' THEN 'canceled'
      ELSE "status"::text
    END
  )::"public"."household_invite_status";--> statement-breakpoint
DROP TYPE "public"."household_invite_status_old";--> statement-breakpoint
ALTER TABLE "household_invites" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint

ALTER TABLE "users" ADD COLUMN "last_active_at" timestamp;--> statement-breakpoint

ALTER TABLE "household_invites" RENAME COLUMN "revoked_at" TO "canceled_at";--> statement-breakpoint
ALTER TABLE "household_invites" ADD COLUMN "rejected_at" timestamp;--> statement-breakpoint
ALTER TABLE "household_invites" ADD COLUMN "expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "household_invites" ADD COLUMN "token_hash" text;--> statement-breakpoint
UPDATE "household_invites"
SET "expires_at" = CASE
  WHEN "status" = 'pending' THEN now() + interval '7 days'
  ELSE "created_at" + interval '7 days'
END
WHERE "expires_at" IS NULL;--> statement-breakpoint
ALTER TABLE "household_invites" ALTER COLUMN "expires_at" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "household_invites_pending_email_unique"
  ON "household_invites" USING btree ("household_id", "email")
  WHERE "status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "household_invites_token_hash_unique"
  ON "household_invites" USING btree ("token_hash")
  WHERE "token_hash" IS NOT NULL;
