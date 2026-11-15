-- 0059_goal_contribution_fx_rate_source
-- A contribution in another currency keeps its rate at full precision and says where the rate came
-- from. `fx_rate` was numeric(24, 10); 14 decimals keep 10+ significant digits even for rates below
-- 0.001. Widening a numeric never changes a stored value. Existing rows keep a null source
-- ("unknown, stored before rates were sourced"); `pnpm goals:fx-backfill` fills them in.
ALTER TABLE "goal_contributions" ALTER COLUMN "fx_rate" TYPE numeric(28, 14);
--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD COLUMN "fx_rate_source" varchar(32);
--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD COLUMN "fx_rate_date" date;
