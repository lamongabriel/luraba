"use client";

import { type HouseholdMember, MAX_PER_PAGE } from "@luraba/contracts";
import * as React from "react";
import { useHouseholdMembersQuery } from "@/queries/households/use-households-query";
import { useAuthSessionStore } from "@/stores/auth-session-store";

/**
 * Resolves a user id (a record's `createdByUserId`) to the household member it belongs to.
 * One shared query for the whole screen; unknown ids (deleted users, old rows) resolve to undefined.
 */
export function useMemberLookup(): {
  members: HouseholdMember[];
  findMember: (userId: string | null | undefined) => HouseholdMember | undefined;
  isLoading: boolean;
} {
  const householdId = useAuthSessionStore((state) => state.activeHouseholdId);
  const query = useHouseholdMembersQuery(householdId, { perPage: MAX_PER_PAGE });
  const members = query.data?.data ?? [];
  const byUserId = React.useMemo(
    () => new Map(members.map((member) => [member.userId, member])),
    [members],
  );

  return {
    members,
    findMember: React.useCallback(
      (userId) => (userId ? byUserId.get(userId) : undefined),
      [byUserId],
    ),
    isLoading: query.isPending,
  };
}
