"use client";

import { useQuery } from "@tanstack/react-query";
import { getCreditCardCycle } from "@/services/credit-cards.service";

export const useCreditCardCycleQuery = (creditCardId: string, cycleId?: string) => {
  return useQuery({
    queryKey: ["credit-cards", creditCardId, "cycles", cycleId],
    queryFn: () => getCreditCardCycle(creditCardId, cycleId ?? ""),
    enabled: Boolean(creditCardId && cycleId),
  });
};
