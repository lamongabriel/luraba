import { paymentMethodsEndpoints } from "@luraba/contracts/payment-methods";
import { createHouseholdHandler } from "@/shared/controllers/household.controller";
import { withApiMeta } from "@/shared/response";
import * as paymentMethodsService from "./payment-methods.service";

export const list = createHouseholdHandler({
  query: paymentMethodsEndpoints.list.query,
  response: paymentMethodsEndpoints.list.response,
  meta: paymentMethodsEndpoints.list.meta,
  handle: async ({ household, query }) => {
    const result = await paymentMethodsService.listPaymentMethods(household, query);
    return withApiMeta(result.data, result.meta);
  },
});

export const create = createHouseholdHandler({
  body: paymentMethodsEndpoints.create.body,
  response: paymentMethodsEndpoints.create.response,
  handle: ({ household, body }) => paymentMethodsService.createPaymentMethod(household, body),
  status: "created",
});

export const update = createHouseholdHandler({
  params: paymentMethodsEndpoints.update.params,
  body: paymentMethodsEndpoints.update.body,
  response: paymentMethodsEndpoints.update.response,
  handle: ({ household, params, body }) =>
    paymentMethodsService.updatePaymentMethod(household, params.id, body),
});

export const deletePaymentMethod = createHouseholdHandler({
  params: paymentMethodsEndpoints.delete.params,
  status: "no-content",
  handle: ({ household, params }) =>
    paymentMethodsService.deletePaymentMethod(household, params.id),
});
