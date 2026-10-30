ALTER TABLE "transactions" ADD COLUMN "created_by_user_id" uuid;
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "created_by_user_id" uuid;
--> statement-breakpoint
ALTER TABLE "credit_cards" ADD COLUMN "created_by_user_id" uuid;
--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "created_by_user_id" uuid;
--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "created_by_user_id" uuid;
--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "created_by_user_id" uuid;
--> statement-breakpoint
ALTER TABLE "payment_methods" ADD COLUMN "created_by_user_id" uuid;
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "credit_cards" ADD CONSTRAINT "credit_cards_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "transactions_created_by_user_id_idx" ON "transactions" USING btree ("created_by_user_id");
