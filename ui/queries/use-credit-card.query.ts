"use client";

import { useQuery } from "@tanstack/react-query";
import { getCreditCard } from "@/services/credit-cards.service";

export const useCreditCardQuery = (creditCardId: string) => {
  return useQuery({
    queryKey: ["credit-cards", creditCardId],
    queryFn: () => getCreditCard(creditCardId),
    enabled: Boolean(creditCardId),
  });
};
