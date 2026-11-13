import { householdFxOverridesTable } from "@luraba/db/schemas/fx-overrides.schema";
import { and, asc, eq } from "drizzle-orm";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";
import { HouseholdScopedRepository } from "@/shared/repositories/household-scoped.repository";

export type FxOverrideRecord = typeof householdFxOverridesTable.$inferSelect;

type CreateFxOverrideValues = Omit<
  typeof householdFxOverridesTable.$inferInsert,
  "id" | "householdId" | "createdAt" | "updatedAt"
>;

class FxOverridesRepository extends HouseholdScopedRepository<
  FxOverrideRecord,
  CreateFxOverrideValues
> {
  constructor() {
    super(householdFxOverridesTable, { orderBy: householdFxOverridesTable.fromCurrencyId });
  }

  async findByPair(
    context: HouseholdContext,
    fromCurrencyCode: string,
    toCurrencyCode: string,
  ): Promise<FxOverrideRecord | undefined> {
    const rows = await db
      .select()
      .from(householdFxOverridesTable)
      .where(
        and(
          eq(householdFxOverridesTable.householdId, context.householdId),
          eq(householdFxOverridesTable.fromCurrencyId, fromCurrencyCode),
          eq(householdFxOverridesTable.toCurrencyId, toCurrencyCode),
        ),
      )
      .orderBy(asc(householdFxOverridesTable.fromCurrencyId))
      .limit(1);
    return rows[0];
  }
}

export const fxOverridesRepository = new FxOverridesRepository();
