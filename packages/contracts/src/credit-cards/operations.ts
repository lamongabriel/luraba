import type { EndpointParams, EndpointResult } from "../api.js";
import type { creditCardsEndpoints } from "./endpoints.js";

export type {
  CreateCreditCardInput,
  CreateCreditCardPaymentInput,
  CreateCreditCardPurchaseInput,
  CreditCardForecastQuery,
  ListCreditCardCyclesQuery,
  ListCreditCardsQuery,
  UpdateCreditCardCycleInput,
  UpdateCreditCardInput,
  UpdateCreditCardPaymentInput,
  UpdateCreditCardPurchaseInput,
} from "./requests.js";
export type GetCreditCardParams = EndpointParams<typeof creditCardsEndpoints.get>;
export type UpdateCreditCardParams = EndpointParams<typeof creditCardsEndpoints.update>;
export type DeleteCreditCardParams = EndpointParams<typeof creditCardsEndpoints.delete>;
export type ListCreditCardCyclesParams = EndpointParams<typeof creditCardsEndpoints.cycles>;
export type GetCreditCardCycleParams = EndpointParams<typeof creditCardsEndpoints.getCycle>;
export type UpdateCreditCardCycleParams = EndpointParams<typeof creditCardsEndpoints.updateCycle>;
export type CreateCreditCardPurchaseParams = EndpointParams<
  typeof creditCardsEndpoints.createPurchase
>;
export type GetCreditCardPurchaseParams = EndpointParams<typeof creditCardsEndpoints.getPurchase>;
export type UpdateCreditCardPurchaseParams = EndpointParams<
  typeof creditCardsEndpoints.updatePurchase
>;
export type DeleteCreditCardPurchaseParams = EndpointParams<
  typeof creditCardsEndpoints.deletePurchase
>;
export type CreateCreditCardPaymentParams = EndpointParams<
  typeof creditCardsEndpoints.createPayment
>;
export type GetCreditCardPaymentParams = EndpointParams<typeof creditCardsEndpoints.getPayment>;
export type UpdateCreditCardPaymentParams = EndpointParams<
  typeof creditCardsEndpoints.updatePayment
>;
export type DeleteCreditCardPaymentParams = EndpointParams<
  typeof creditCardsEndpoints.deletePayment
>;
export type GetCreditCardForecastParams = EndpointParams<typeof creditCardsEndpoints.forecast>;
export type ListCreditCardsResult = EndpointResult<typeof creditCardsEndpoints.list>;
export type CreateCreditCardResult = EndpointResult<typeof creditCardsEndpoints.create>;
export type GetCreditCardResult = EndpointResult<typeof creditCardsEndpoints.get>;
export type UpdateCreditCardResult = EndpointResult<typeof creditCardsEndpoints.update>;
export type DeleteCreditCardResult = EndpointResult<typeof creditCardsEndpoints.delete>;
export type ListCreditCardCyclesResult = EndpointResult<typeof creditCardsEndpoints.cycles>;
export type GetCreditCardCycleResult = EndpointResult<typeof creditCardsEndpoints.getCycle>;
export type UpdateCreditCardCycleResult = EndpointResult<typeof creditCardsEndpoints.updateCycle>;
export type CreateCreditCardPurchaseResult = EndpointResult<
  typeof creditCardsEndpoints.createPurchase
>;
export type GetCreditCardPurchaseResult = EndpointResult<typeof creditCardsEndpoints.getPurchase>;
export type UpdateCreditCardPurchaseResult = EndpointResult<
  typeof creditCardsEndpoints.updatePurchase
>;
export type DeleteCreditCardPurchaseResult = EndpointResult<
  typeof creditCardsEndpoints.deletePurchase
>;
export type CreateCreditCardPaymentResult = EndpointResult<
  typeof creditCardsEndpoints.createPayment
>;
export type GetCreditCardPaymentResult = EndpointResult<typeof creditCardsEndpoints.getPayment>;
export type UpdateCreditCardPaymentResult = EndpointResult<
  typeof creditCardsEndpoints.updatePayment
>;
export type DeleteCreditCardPaymentResult = EndpointResult<
  typeof creditCardsEndpoints.deletePayment
>;
export type GetCreditCardForecastResult = EndpointResult<typeof creditCardsEndpoints.forecast>;
