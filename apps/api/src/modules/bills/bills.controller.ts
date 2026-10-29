import { billsEndpoints } from "@luraba/contracts/bills";
import { createHouseholdHandler } from "@/shared/controllers/household.controller";
import { withApiMeta } from "@/shared/response";
import * as service from "./bills.service";

export const list = createHouseholdHandler({
  query: billsEndpoints.list.query,
  response: billsEndpoints.list.response,
  meta: billsEndpoints.list.meta,
  handle: async ({ household, query }) => {
    const result = await service.listBills(household, query);
    return withApiMeta(result.data, result.meta);
  },
});

export const forecast = createHouseholdHandler({
  query: billsEndpoints.forecast.query,
  response: billsEndpoints.forecast.response,
  handle: ({ household, query }) => service.getForecast(household, query),
});

export const get = createHouseholdHandler({
  params: billsEndpoints.get.params,
  response: billsEndpoints.get.response,
  handle: ({ household, params }) => service.getBill(household, params.id),
});

export const create = createHouseholdHandler({
  body: billsEndpoints.create.body,
  response: billsEndpoints.create.response,
  status: "created",
  handle: ({ household, body }) => service.createBill(household, body),
});

export const update = createHouseholdHandler({
  params: billsEndpoints.update.params,
  body: billsEndpoints.update.body,
  response: billsEndpoints.update.response,
  handle: ({ household, params, body }) => service.updateBill(household, params.id, body),
});

export const pause = createHouseholdHandler({
  params: billsEndpoints.pause.params,
  response: billsEndpoints.pause.response,
  handle: ({ household, params }) => service.pauseBill(household, params.id),
});

export const resume = createHouseholdHandler({
  params: billsEndpoints.resume.params,
  response: billsEndpoints.resume.response,
  handle: ({ household, params }) => service.resumeBill(household, params.id),
});

export const cancel = createHouseholdHandler({
  params: billsEndpoints.cancel.params,
  response: billsEndpoints.cancel.response,
  handle: ({ household, params }) => service.cancelBill(household, params.id),
});

export const deleteBill = createHouseholdHandler({
  params: billsEndpoints.delete.params,
  status: "no-content",
  handle: ({ household, params }) => service.deleteBill(household, params.id),
});

export const listOccurrences = createHouseholdHandler({
  params: billsEndpoints.listOccurrences.params,
  query: billsEndpoints.listOccurrences.query,
  response: billsEndpoints.listOccurrences.response,
  meta: billsEndpoints.listOccurrences.meta,
  handle: async ({ household, params, query }) => {
    const result = await service.listOccurrences(household, params.id, query);
    return withApiMeta(result.data, result.meta);
  },
});

export const updateOccurrence = createHouseholdHandler({
  params: billsEndpoints.updateOccurrence.params,
  body: billsEndpoints.updateOccurrence.body,
  response: billsEndpoints.updateOccurrence.response,
  handle: ({ household, params, body }) =>
    service.updateOccurrenceAmount(household, params.id, params.occurrenceId, body.expectedAmount),
});

export const linkOccurrence = createHouseholdHandler({
  params: billsEndpoints.linkOccurrence.params,
  body: billsEndpoints.linkOccurrence.body,
  response: billsEndpoints.linkOccurrence.response,
  handle: ({ household, params, body }) =>
    service.linkTransaction(household, params.id, params.occurrenceId, body.transactionId),
});

export const markOccurrencePaid = createHouseholdHandler({
  params: billsEndpoints.markOccurrencePaid.params,
  response: billsEndpoints.markOccurrencePaid.response,
  handle: ({ household, params }) =>
    service.markOccurrencePaid(household, params.id, params.occurrenceId),
});

export const skipOccurrence = createHouseholdHandler({
  params: billsEndpoints.skipOccurrence.params,
  response: billsEndpoints.skipOccurrence.response,
  handle: ({ household, params }) =>
    service.skipOccurrence(household, params.id, params.occurrenceId),
});

export const resetOccurrence = createHouseholdHandler({
  params: billsEndpoints.resetOccurrence.params,
  response: billsEndpoints.resetOccurrence.response,
  handle: ({ household, params }) =>
    service.resetOccurrence(household, params.id, params.occurrenceId),
});
