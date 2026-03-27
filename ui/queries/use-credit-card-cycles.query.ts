"use client";

import { useQuery } from "@tanstack/react-query";
import { listCreditCardCycles } from "@/services/credit-cards.service";

export const useCreditCardCyclesQuery = (creditCardId: string) => {
  return useQuery({
    queryKey: ["credit-cards", creditCardId, "cycles"],
    queryFn: () => listCreditCardCycles(creditCardId),
    enabled: Boolean(creditCardId),
  });
};
