ALTER TABLE "users" ADD COLUMN "phone_number" varchar(20);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "country_code" varchar(2);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "date_of_birth" date;
--> statement-breakpoint
UPDATE "users" SET "phone_number" = "notification_contacts"."phone_number" FROM "notification_contacts" WHERE "notification_contacts"."user_id" = "users"."id";
--> statement-breakpoint
DROP TABLE "notification_contacts";
