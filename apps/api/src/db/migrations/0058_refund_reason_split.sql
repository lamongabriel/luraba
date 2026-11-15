-- 0058_refund_reason_split
-- Hand-written migration. Separate statements with --> statement-breakpoint
-- A friend paying back their share of a purchase.
ALTER TYPE "public"."refund_reason" ADD VALUE IF NOT EXISTS 'split';
