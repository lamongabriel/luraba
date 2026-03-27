import { lurabaApiClient } from "@/api/luraba-api";
import type { ListPaymentMethodsHttpResponse } from "@/interfaces/http/payment-methods";

export const listPaymentMethods = async (
  currencyCode?: string,
): Promise<ListPaymentMethodsHttpResponse["data"]> => {
  const { data } = await lurabaApiClient.get<ListPaymentMethodsHttpResponse>("/payment-methods", {
    params: currencyCode ? { currencyCode } : undefined,
  });
  return data.data;
};
