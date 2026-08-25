ALTER TABLE "household_brandfetch_integrations" RENAME TO "brandfetch_integrations";
--> statement-breakpoint
ALTER INDEX "household_brandfetch_integrations_household_unique" RENAME TO "brandfetch_integrations_household_unique";
--> statement-breakpoint
ALTER TABLE "brandfetch_integrations"
RENAME CONSTRAINT "household_brandfetch_integrations_household_id_households_id_fk"
TO "brandfetch_integrations_household_id_households_id_fk";
