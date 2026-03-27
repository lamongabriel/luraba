import type { ApiSuccessHttp } from "@/interfaces/http/api-responses";

export interface PaymentMethodHttp {
  id: string;
  code: string;
  name: string;
  currencyCode: string | null;
}

export type ListPaymentMethodsHttpResponse = ApiSuccessHttp<PaymentMethodHttp[]>;
