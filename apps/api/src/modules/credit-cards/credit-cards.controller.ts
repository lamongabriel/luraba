import { creditCardsEndpoints } from '@luraba/contracts';
import { createHouseholdHandler } from '@/shared/controllers/household.controller';
import { withApiMeta } from '@/shared/response';
import * as service from './credit-cards.service';

export const list = createHouseholdHandler({
  query: creditCardsEndpoints.list.query,
  response: creditCardsEndpoints.list.response,
  meta: creditCardsEndpoints.list.meta,
  handle: async ({ household, query }) => {
    const result = await service.listCreditCards(household, query);
    return withApiMeta(result.data, result.meta);
  },
});
export const create = createHouseholdHandler({
  body: creditCardsEndpoints.create.body,
  response: creditCardsEndpoints.create.response,
  status: 'created',
  handle: ({ household, body }) => service.createCreditCard(household, body),
});
export const getById = createHouseholdHandler({
  params: creditCardsEndpoints.get.params,
  response: creditCardsEndpoints.get.response,
  handle: ({ household, params }) => service.getCreditCard(household, params.id),
});
export const update = createHouseholdHandler({
  params: creditCardsEndpoints.update.params,
  body: creditCardsEndpoints.update.body,
  response: creditCardsEndpoints.update.response,
  handle: ({ household, params, body }) => service.updateCreditCard(household, params.id, body),
});
export const deleteCreditCard = createHouseholdHandler({
  params: creditCardsEndpoints.delete.params,
  status: 'no-content',
  handle: ({ household, params }) => service.deleteCreditCard(household, params.id),
});
export const listCycles = createHouseholdHandler({
  params: creditCardsEndpoints.cycles.params,
  query: creditCardsEndpoints.cycles.query,
  response: creditCardsEndpoints.cycles.response,
  meta: creditCardsEndpoints.cycles.meta,
  handle: async ({ household, params, query }) => {
    const result = await service.listBillingCycles(household, params.id, query);
    return withApiMeta(result.data, result.meta);
  },
});
export const getCycle = createHouseholdHandler({
  params: creditCardsEndpoints.getCycle.params,
  response: creditCardsEndpoints.getCycle.response,
  handle: ({ household, params }) => service.getBillingCycle(household, params.id, params.cycleId),
});
export const updateCycle = createHouseholdHandler({
  params: creditCardsEndpoints.updateCycle.params,
  body: creditCardsEndpoints.updateCycle.body,
  response: creditCardsEndpoints.updateCycle.response,
  handle: ({ household, params, body }) =>
    service.updateBillingCycle(household, params.id, params.cycleId, body),
});
export const createPurchase = createHouseholdHandler({
  params: creditCardsEndpoints.createPurchase.params,
  body: creditCardsEndpoints.createPurchase.body,
  response: creditCardsEndpoints.createPurchase.response,
  status: 'created',
  handle: ({ household, params, body }) => service.createPurchase(household, params.id, body),
});
export const getPurchase = createHouseholdHandler({
  params: creditCardsEndpoints.getPurchase.params,
  response: creditCardsEndpoints.getPurchase.response,
  handle: ({ household, params }) => service.getPurchase(household, params.id, params.purchaseId),
});
export const updatePurchase = createHouseholdHandler({
  params: creditCardsEndpoints.updatePurchase.params,
  body: creditCardsEndpoints.updatePurchase.body,
  response: creditCardsEndpoints.updatePurchase.response,
  handle: ({ household, params, body }) =>
    service.updatePurchase(household, params.id, params.purchaseId, body),
});
export const deletePurchase = createHouseholdHandler({
  params: creditCardsEndpoints.deletePurchase.params,
  status: 'no-content',
  handle: ({ household, params }) =>
    service.deletePurchase(household, params.id, params.purchaseId),
});
export const createPayment = createHouseholdHandler({
  params: creditCardsEndpoints.createPayment.params,
  body: creditCardsEndpoints.createPayment.body,
  response: creditCardsEndpoints.createPayment.response,
  status: 'created',
  handle: ({ household, params, body }) => service.createPayment(household, params.id, body),
});
export const getPayment = createHouseholdHandler({
  params: creditCardsEndpoints.getPayment.params,
  response: creditCardsEndpoints.getPayment.response,
  handle: ({ household, params }) => service.getPayment(household, params.id, params.paymentId),
});
export const updatePayment = createHouseholdHandler({
  params: creditCardsEndpoints.updatePayment.params,
  body: creditCardsEndpoints.updatePayment.body,
  response: creditCardsEndpoints.updatePayment.response,
  handle: ({ household, params, body }) =>
    service.updatePayment(household, params.id, params.paymentId, body),
});
export const deletePayment = createHouseholdHandler({
  params: creditCardsEndpoints.deletePayment.params,
  status: 'no-content',
  handle: ({ household, params }) => service.deletePayment(household, params.id, params.paymentId),
});
export const getForecast = createHouseholdHandler({
  params: creditCardsEndpoints.forecast.params,
  query: creditCardsEndpoints.forecast.query,
  response: creditCardsEndpoints.forecast.response,
  handle: ({ household, params, query }) => service.getForecast(household, params.id, query),
});
