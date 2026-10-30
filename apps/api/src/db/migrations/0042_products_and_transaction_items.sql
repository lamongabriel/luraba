CREATE TABLE "products" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "household_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "image_upload_id" uuid,
  "price" bigint,
  "currency_id" varchar(3) NOT NULL,
  "created_by_user_id" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "transaction_id" uuid NOT NULL,
  "product_id" uuid,
  "name" varchar(255) NOT NULL,
  "quantity" integer DEFAULT 1 NOT NULL,
  "unit_price" bigint NOT NULL,
  "position" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_image_upload_id_uploads_id_fk" FOREIGN KEY ("image_upload_id") REFERENCES "public"."uploads"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_currency_id_currencies_code_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("code") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "products_household_name_unique" ON "products" USING btree ("household_id","name");
--> statement-breakpoint
CREATE INDEX "transaction_items_transaction_id_idx" ON "transaction_items" USING btree ("transaction_id");
--> statement-breakpoint
CREATE INDEX "transaction_items_product_id_idx" ON "transaction_items" USING btree ("product_id");
