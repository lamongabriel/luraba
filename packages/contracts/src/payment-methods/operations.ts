import type { EndpointParams, EndpointResult } from "../api.js";
import type { paymentMethodsEndpoints } from "./endpoints.js";
import type {
  CreatePaymentMethodInput,
  ListPaymentMethodsQuery,
  UpdatePaymentMethodInput,
} from "./requests.js";

export type { CreatePaymentMethodInput, ListPaymentMethodsQuery, UpdatePaymentMethodInput };
export type UpdatePaymentMethodParams = EndpointParams<typeof paymentMethodsEndpoints.update>;
export type DeletePaymentMethodParams = EndpointParams<typeof paymentMethodsEndpoints.delete>;
export type ListPaymentMethodsResult = EndpointResult<typeof paymentMethodsEndpoints.list>;
export type CreatePaymentMethodResult = EndpointResult<typeof paymentMethodsEndpoints.create>;
export type UpdatePaymentMethodResult = EndpointResult<typeof paymentMethodsEndpoints.update>;
export type DeletePaymentMethodResult = EndpointResult<typeof paymentMethodsEndpoints.delete>;
