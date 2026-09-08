"use client";

import { hasHouseholdPermission, PERMISSIONS } from "@luraba/contracts";
import { useCurrentUserQuery } from "@/queries/auth/use-current-user-query";

export function useIsHouseholdAdmin() {
  const { data: session } = useCurrentUserQuery();
  const role = session?.household?.role;

  return role ? hasHouseholdPermission(role, PERMISSIONS.HOUSEHOLD_MEMBERS_MANAGE) : false;
}
