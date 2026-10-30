CREATE TABLE "investment_import_batches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "household_id" uuid NOT NULL,
  "account_id" uuid NOT NULL,
  "format" varchar(32) NOT NULL,
  "file_name" varchar(255),
  "status" varchar(16) DEFAULT 'previewed' NOT NULL,
  "rows" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_by_user_id" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investment_import_mappings" (
  "household_id" uuid NOT NULL,
  "name" varchar(128) NOT NULL,
  "mapping" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "investment_import_mappings_pk" PRIMARY KEY("household_id","name")
);
--> statement-breakpoint
ALTER TABLE "investment_import_batches" ADD CONSTRAINT "investment_import_batches_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "investment_import_batches" ADD CONSTRAINT "investment_import_batches_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "investment_import_batches" ADD CONSTRAINT "investment_import_batches_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "investment_import_mappings" ADD CONSTRAINT "investment_import_mappings_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "investment_import_batches_household_idx" ON "investment_import_batches" USING btree ("household_id","created_at");
--> statement-breakpoint
INSERT INTO "assets" ("symbol","name","asset_class","exchange","country","currency_id","sector","industry","isin") VALUES
('^BVSP','Ibovespa Index','OTHER','INDEX','BR','BRL',NULL,NULL,NULL),
('IFIX','IFIX Real Estate Funds Index','OTHER','INDEX','BR','BRL',NULL,NULL,NULL),
('^GSPC','S&P 500 Index','OTHER','INDEX','US','USD',NULL,NULL,NULL)
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "asset_provider_symbols" ("asset_id","provider","provider_symbol")
SELECT a."id", v."provider", v."provider_symbol" FROM (VALUES
('^BVSP','INDEX','yahoo','^BVSP'),
('^GSPC','INDEX','yahoo','^GSPC'),
('^GSPC','INDEX','alphavantage','SPY'),
('IFIX','INDEX','yahoo','^IFIX'),
('IFIX','INDEX','brapi','IFIX')
) AS v("symbol","exchange","provider","provider_symbol")
JOIN "assets" a ON a."symbol" = v."symbol" AND a."exchange" = v."exchange" AND a."household_id" IS NULL
ON CONFLICT DO NOTHING;
