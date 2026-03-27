"use client";

import { useQuery } from "@tanstack/react-query";
import { getCreditCardForecast } from "@/services/credit-cards.service";

export const useCreditCardForecastQuery = (
  creditCardId: string,
  fromMonth?: string,
  months = 6,
) => {
  return useQuery({
    queryKey: ["credit-cards", creditCardId, "forecast", fromMonth ?? "auto", months],
    queryFn: () => getCreditCardForecast(creditCardId, fromMonth, months),
    enabled: Boolean(creditCardId),
  });
};
