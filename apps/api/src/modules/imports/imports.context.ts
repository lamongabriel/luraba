import { getPermissionsForRole } from "@luraba/contracts";
import { householdMembersTable, householdsTable } from "@luraba/db/schemas/households.schema";
import { and, eq } from "drizzle-orm";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";

/** Rebuilds the request context for a background job from the batch's household and user. */
export async function loadHouseholdContext(
  householdId: string,
  userId: string,
): Promise<HouseholdContext | undefined> {
  const rows = await db
    .select({
      role: householdMembersTable.role,
      timezone: householdsTable.timezone,
      creditExpenseTiming: householdsTable.creditExpenseTiming,
      creditInstallmentBudgetMode: householdsTable.creditInstallmentBudgetMode,
    })
    .from(householdMembersTable)
    .innerJoin(householdsTable, eq(householdsTable.id, householdMembersTable.householdId))
    .where(
      and(
        eq(householdMembersTable.householdId, householdId),
        eq(householdMembersTable.userId, userId),
      ),
    );
  const membership = rows[0];
  if (!membership) return undefined;
  return {
    householdId,
    userId,
    role: membership.role,
    permissions: getPermissionsForRole(membership.role),
    timezone: membership.timezone,
    creditExpenseTiming: membership.creditExpenseTiming,
    creditInstallmentBudgetMode: membership.creditInstallmentBudgetMode,
  };
}
