import { lurabaApiClient } from "@/api/luraba-api";
import type {
  CreateCreditCardHttpParams,
  CreateCreditCardHttpResponse,
  CreateCreditCardPaymentHttpParams,
  CreateCreditCardPaymentHttpResponse,
  CreateCreditCardPurchaseHttpParams,
  CreateCreditCardPurchaseHttpResponse,
  GetCreditCardCycleHttpResponse,
  GetCreditCardForecastHttpResponse,
  GetCreditCardHttpResponse,
  ListCreditCardCyclesHttpResponse,
  ListCreditCardsHttpResponse,
  UpdateCreditCardCycleHttpParams,
  UpdateCreditCardCycleHttpResponse,
  UpdateCreditCardHttpParams,
  UpdateCreditCardHttpResponse,
} from "@/interfaces/http/credit-cards";

export const listCreditCards = async (): Promise<ListCreditCardsHttpResponse["data"]> => {
  const { data } = await lurabaApiClient.get<ListCreditCardsHttpResponse>("/credit-cards");
  return data.data;
};

export const getCreditCard = async (
  creditCardId: string,
): Promise<GetCreditCardHttpResponse["data"]> => {
  const { data } = await lurabaApiClient.get<GetCreditCardHttpResponse>(`/credit-cards/${creditCardId}`);
  return data.data;
};

export const createCreditCard = async (
  params: CreateCreditCardHttpParams,
): Promise<CreateCreditCardHttpResponse["data"]> => {
  const { data } = await lurabaApiClient.post<CreateCreditCardHttpResponse>("/credit-cards", params);
  return data.data;
};

export const updateCreditCard = async (
  creditCardId: string,
  params: UpdateCreditCardHttpParams,
): Promise<UpdateCreditCardHttpResponse["data"]> => {
  const { data } = await lurabaApiClient.patch<UpdateCreditCardHttpResponse>(`/credit-cards/${creditCardId}`, params);
  return data.data;
};

export const listCreditCardCycles = async (
  creditCardId: string,
): Promise<ListCreditCardCyclesHttpResponse["data"]> => {
  const { data } = await lurabaApiClient.get<ListCreditCardCyclesHttpResponse>(`/credit-cards/${creditCardId}/cycles`);
  return data.data;
};

export const getCreditCardCycle = async (
  creditCardId: string,
  cycleId: string,
): Promise<GetCreditCardCycleHttpResponse["data"]> => {
  const { data } = await lurabaApiClient.get<GetCreditCardCycleHttpResponse>(
    `/credit-cards/${creditCardId}/cycles/${cycleId}`,
  );
  return data.data;
};

export const updateCreditCardCycle = async (
  creditCardId: string,
  cycleId: string,
  params: UpdateCreditCardCycleHttpParams,
): Promise<UpdateCreditCardCycleHttpResponse["data"]> => {
  const { data } = await lurabaApiClient.patch<UpdateCreditCardCycleHttpResponse>(
    `/credit-cards/${creditCardId}/cycles/${cycleId}`,
    params,
  );
  return data.data;
};

export const createCreditCardPurchase = async (
  creditCardId: string,
  params: CreateCreditCardPurchaseHttpParams,
): Promise<CreateCreditCardPurchaseHttpResponse["data"]> => {
  const { data } = await lurabaApiClient.post<CreateCreditCardPurchaseHttpResponse>(
    `/credit-cards/${creditCardId}/purchases`,
    params,
  );
  return data.data;
};

export const createCreditCardPayment = async (
  creditCardId: string,
  params: CreateCreditCardPaymentHttpParams,
): Promise<CreateCreditCardPaymentHttpResponse["data"]> => {
  const { data } = await lurabaApiClient.post<CreateCreditCardPaymentHttpResponse>(
    `/credit-cards/${creditCardId}/payments`,
    params,
  );
  return data.data;
};

export const getCreditCardForecast = async (
  creditCardId: string,
  fromMonth?: string,
  months = 12,
): Promise<GetCreditCardForecastHttpResponse["data"]> => {
  const { data } = await lurabaApiClient.get<GetCreditCardForecastHttpResponse>(
    `/credit-cards/${creditCardId}/forecast`,
    {
      params: {
        months,
        ...(fromMonth ? { fromMonth } : {}),
      },
    },
  );
  return data.data;
};
