"use client";

import { useQuery } from "@tanstack/react-query";
import { listTransactions } from "@/services/transactions.service";

export const useTransactionsQuery = () => {
  return useQuery({
    queryKey: ["transactions"],
    queryFn: listTransactions,
  });
};
