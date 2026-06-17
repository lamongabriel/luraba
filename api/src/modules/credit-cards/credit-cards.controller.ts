import { createHouseholdHandler } from '@/shared/controllers/household.controller';
import * as creditCardsService from './credit-cards.service';
import {
  CreateCreditCardPaymentRequestBodySchema,
  CreateCreditCardPaymentRequestParamsSchema,
  CreateCreditCardPaymentResponseSchema,
  CreateCreditCardPurchaseRequestBodySchema,
  CreateCreditCardPurchaseRequestParamsSchema,
  CreateCreditCardPurchaseResponseSchema,
  CreateCreditCardRequestBodySchema,
  CreateCreditCardResponseSchema,
  DeleteCreditCardPaymentRequestParamsSchema,
  DeleteCreditCardPurchaseRequestParamsSchema,
  DeleteCreditCardRequestParamsSchema,
  GetCreditCardCycleRequestParamsSchema,
  GetCreditCardCycleResponseSchema,
  GetCreditCardForecastRequestParamsSchema,
  GetCreditCardForecastRequestQuerySchema,
  GetCreditCardForecastResponseSchema,
  GetCreditCardPaymentRequestParamsSchema,
  GetCreditCardPaymentResponseSchema,
  GetCreditCardPurchaseRequestParamsSchema,
  GetCreditCardPurchaseResponseSchema,
  GetCreditCardRequestParamsSchema,
  GetCreditCardResponseSchema,
  ListCreditCardCyclesRequestParamsSchema,
  ListCreditCardCyclesRequestQuerySchema,
  ListCreditCardCyclesResponseSchema,
  ListCreditCardsResponseSchema,
  UpdateCreditCardCycleRequestBodySchema,
  UpdateCreditCardCycleRequestParamsSchema,
  UpdateCreditCardCycleResponseSchema,
  UpdateCreditCardPaymentRequestBodySchema,
  UpdateCreditCardPaymentRequestParamsSchema,
  UpdateCreditCardPaymentResponseSchema,
  UpdateCreditCardPurchaseRequestBodySchema,
  UpdateCreditCardPurchaseRequestParamsSchema,
  UpdateCreditCardPurchaseResponseSchema,
  UpdateCreditCardRequestBodySchema,
  UpdateCreditCardRequestParamsSchema,
  UpdateCreditCardResponseSchema,
} from './credit-cards.types';

export const list = createHouseholdHandler({
  response: ListCreditCardsResponseSchema,
  handle: ({ household }) => creditCardsService.listCreditCards(household),
});

export const create = createHouseholdHandler({
  body: CreateCreditCardRequestBodySchema,
  response: CreateCreditCardResponseSchema,
  status: 'created',
  handle: ({ household, body }) => creditCardsService.createCreditCard(household, body),
});

export const getById = createHouseholdHandler({
  params: GetCreditCardRequestParamsSchema,
  response: GetCreditCardResponseSchema,
  handle: ({ household, params }) => creditCardsService.getCreditCard(household, params.id),
});

export const update = createHouseholdHandler({
  params: UpdateCreditCardRequestParamsSchema,
  body: UpdateCreditCardRequestBodySchema,
  response: UpdateCreditCardResponseSchema,
  handle: ({ household, params, body }) =>
    creditCardsService.updateCreditCard(household, params.id, body),
});

export const deleteCreditCard = createHouseholdHandler({
  params: DeleteCreditCardRequestParamsSchema,
  status: 'no-content',
  handle: ({ household, params }) => creditCardsService.deleteCreditCard(household, params.id),
});

export const listCycles = createHouseholdHandler({
  params: ListCreditCardCyclesRequestParamsSchema,
  query: ListCreditCardCyclesRequestQuerySchema,
  response: ListCreditCardCyclesResponseSchema,
  handle: ({ household, params, query }) =>
    creditCardsService.listBillingCycles(household, params.id, query),
});

export const getCycle = createHouseholdHandler({
  params: GetCreditCardCycleRequestParamsSchema,
  response: GetCreditCardCycleResponseSchema,
  handle: ({ household, params }) =>
    creditCardsService.getBillingCycle(household, params.id, params.cycleId),
});

export const updateCycle = createHouseholdHandler({
  params: UpdateCreditCardCycleRequestParamsSchema,
  body: UpdateCreditCardCycleRequestBodySchema,
  response: UpdateCreditCardCycleResponseSchema,
  handle: ({ household, params, body }) =>
    creditCardsService.updateBillingCycle(household, params.id, params.cycleId, body),
});

export const createPurchase = createHouseholdHandler({
  params: CreateCreditCardPurchaseRequestParamsSchema,
  body: CreateCreditCardPurchaseRequestBodySchema,
  response: CreateCreditCardPurchaseResponseSchema,
  status: 'created',
  handle: ({ household, params, body }) =>
    creditCardsService.createPurchase(household, params.id, body),
});

export const getPurchase = createHouseholdHandler({
  params: GetCreditCardPurchaseRequestParamsSchema,
  response: GetCreditCardPurchaseResponseSchema,
  handle: ({ household, params }) =>
    creditCardsService.getPurchase(household, params.id, params.purchaseId),
});

export const updatePurchase = createHouseholdHandler({
  params: UpdateCreditCardPurchaseRequestParamsSchema,
  body: UpdateCreditCardPurchaseRequestBodySchema,
  response: UpdateCreditCardPurchaseResponseSchema,
  handle: ({ household, params, body }) =>
    creditCardsService.updatePurchase(household, params.id, params.purchaseId, body),
});

export const deletePurchase = createHouseholdHandler({
  params: DeleteCreditCardPurchaseRequestParamsSchema,
  status: 'no-content',
  handle: ({ household, params }) =>
    creditCardsService.deletePurchase(household, params.id, params.purchaseId),
});

export const createPayment = createHouseholdHandler({
  params: CreateCreditCardPaymentRequestParamsSchema,
  body: CreateCreditCardPaymentRequestBodySchema,
  response: CreateCreditCardPaymentResponseSchema,
  status: 'created',
  handle: ({ household, params, body }) =>
    creditCardsService.createPayment(household, params.id, body),
});

export const getPayment = createHouseholdHandler({
  params: GetCreditCardPaymentRequestParamsSchema,
  response: GetCreditCardPaymentResponseSchema,
  handle: ({ household, params }) =>
    creditCardsService.getPayment(household, params.id, params.paymentId),
});

export const updatePayment = createHouseholdHandler({
  params: UpdateCreditCardPaymentRequestParamsSchema,
  body: UpdateCreditCardPaymentRequestBodySchema,
  response: UpdateCreditCardPaymentResponseSchema,
  handle: ({ household, params, body }) =>
    creditCardsService.updatePayment(household, params.id, params.paymentId, body),
});

export const deletePayment = createHouseholdHandler({
  params: DeleteCreditCardPaymentRequestParamsSchema,
  status: 'no-content',
  handle: ({ household, params }) =>
    creditCardsService.deletePayment(household, params.id, params.paymentId),
});

export const getForecast = createHouseholdHandler({
  params: GetCreditCardForecastRequestParamsSchema,
  query: GetCreditCardForecastRequestQuerySchema,
  response: GetCreditCardForecastResponseSchema,
  handle: ({ household, params, query }) =>
    creditCardsService.getForecast(household, params.id, query),
});
