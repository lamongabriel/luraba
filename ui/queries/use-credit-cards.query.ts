"use client";

import { useQuery } from "@tanstack/react-query";
import { listCreditCards } from "@/services/credit-cards.service";

export const useCreditCardsQuery = () => {
  return useQuery({
    queryKey: ["credit-cards"],
    queryFn: listCreditCards,
  });
};
