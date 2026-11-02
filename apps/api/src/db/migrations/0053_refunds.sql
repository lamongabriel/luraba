ALTER TYPE "public"."transaction_type" ADD VALUE IF NOT EXISTS 'refund';
--> statement-breakpoint
CREATE TYPE "public"."refund_reason" AS ENUM('refund', 'cancellation', 'chargeback', 'cashback');
--> statement-breakpoint
CREATE TABLE "transaction_refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"reason" "refund_reason" NOT NULL,
	"original_transaction_id" uuid,
	"credit_card_id" uuid,
	"billing_cycle_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transaction_refunds" ADD CONSTRAINT "transaction_refunds_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "transaction_refunds" ADD CONSTRAINT "transaction_refunds_original_transaction_id_transactions_id_fk" FOREIGN KEY ("original_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "transaction_refunds" ADD CONSTRAINT "transaction_refunds_credit_card_id_credit_cards_id_fk" FOREIGN KEY ("credit_card_id") REFERENCES "public"."credit_cards"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "transaction_refunds" ADD CONSTRAINT "transaction_refunds_billing_cycle_id_credit_card_billing_cycles_id_fk" FOREIGN KEY ("billing_cycle_id") REFERENCES "public"."credit_card_billing_cycles"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "transaction_refunds_transaction_id_unique" ON "transaction_refunds" USING btree ("transaction_id");
--> statement-breakpoint
CREATE INDEX "transaction_refunds_original_idx" ON "transaction_refunds" USING btree ("original_transaction_id");
--> statement-breakpoint
CREATE INDEX "transaction_refunds_billing_cycle_idx" ON "transaction_refunds" USING btree ("billing_cycle_id");
