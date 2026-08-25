ALTER TABLE "transaction_tags"
ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;
