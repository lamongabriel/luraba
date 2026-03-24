"use client";

import { useQuery } from "@tanstack/react-query";
import { listAccounts } from "@/services/accounts.service";

export const useAccountsQuery = () => {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: listAccounts,
  });
};
