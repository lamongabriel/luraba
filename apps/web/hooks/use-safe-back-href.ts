"use client";

import { getFirstAccessibleRoute } from "@/lib/navigation";
import { useCurrentUserQuery } from "@/queries/auth/use-current-user-query";

export function useSafeBackHref() {
  const { data: session } = useCurrentUserQuery();

  return getFirstAccessibleRoute(session?.household?.permissions ?? []);
}
