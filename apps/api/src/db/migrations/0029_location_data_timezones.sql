ALTER TABLE "users"
ALTER COLUMN "preferred_timezone" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "users"
ALTER COLUMN "preferred_timezone" TYPE varchar(64)
USING "preferred_timezone"::text;
--> statement-breakpoint
ALTER TABLE "users"
ALTER COLUMN "preferred_timezone" SET DEFAULT 'America/Sao_Paulo';
--> statement-breakpoint
ALTER TABLE "households"
ALTER COLUMN "timezone" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "households"
ALTER COLUMN "timezone" TYPE varchar(64)
USING "timezone"::text;
--> statement-breakpoint
ALTER TABLE "households"
ALTER COLUMN "timezone" SET DEFAULT 'America/Sao_Paulo';
--> statement-breakpoint
DROP TYPE "preferred_timezone";
