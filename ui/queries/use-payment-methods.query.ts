"use client";

import { useQuery } from "@tanstack/react-query";
import { listPaymentMethods } from "@/services/payment-methods.service";

export const usePaymentMethodsQuery = (currencyCode?: string) => {
  return useQuery({
    queryKey: ["payment-methods", currencyCode ?? "default"],
    queryFn: () => listPaymentMethods(currencyCode),
  });
};
