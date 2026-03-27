"use client";

import { useQuery } from "@tanstack/react-query";
import { getAccountHistory } from "@/services/accounts.service";

export const useAccountHistoryQuery = (accountId: string) => {
  return useQuery({
    queryKey: ["accounts", accountId, "history"],
    queryFn: () => getAccountHistory(accountId),
    enabled: Boolean(accountId),
  });
};
