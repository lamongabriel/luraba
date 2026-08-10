ALTER TABLE "households"
ALTER COLUMN "country_code" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "households"
ALTER COLUMN "country_code" TYPE varchar(2)
USING "country_code"::text;
--> statement-breakpoint
ALTER TABLE "households"
ALTER COLUMN "country_code" SET DEFAULT 'BR';
--> statement-breakpoint
ALTER TABLE "households"
ADD CONSTRAINT "households_country_code_format"
CHECK ("country_code" ~ '^[A-Z]{2}$');
--> statement-breakpoint
DROP TYPE "country_code";
