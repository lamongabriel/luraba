ALTER TABLE "users" ADD COLUMN "preferred_language" varchar(16) DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "preferred_currency" varchar(8) DEFAULT 'BRL' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "preferred_timezone" varchar(64) DEFAULT 'America/Sao_Paulo' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "preferred_date_format" varchar(32) DEFAULT 'DD/MM/YYYY' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "default_period" varchar(32) DEFAULT 'current_month' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "default_account_order" varchar(32) DEFAULT 'name_asc' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "country_code" varchar(2) DEFAULT 'BR' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "budget_month_starts_on" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "theme_preference" varchar(16) DEFAULT 'system' NOT NULL;