import { createHouseholdHandler } from '@/shared/controllers/household.controller';
import * as paymentMethodsService from './payment-methods.service';
import {
  CreatePaymentMethodRequestBodySchema,
  CreatePaymentMethodResponseSchema,
  DeletePaymentMethodRequestParamsSchema,
  ListPaymentMethodsRequestQuerySchema,
  ListPaymentMethodsResponseSchema,
  UpdatePaymentMethodRequestBodySchema,
  UpdatePaymentMethodRequestParamsSchema,
  UpdatePaymentMethodResponseSchema,
} from './payment-methods.types';

export const list = createHouseholdHandler({
  query: ListPaymentMethodsRequestQuerySchema,
  response: ListPaymentMethodsResponseSchema,
  handle: ({ household, query }) => paymentMethodsService.listPaymentMethods(household, query),
});

export const create = createHouseholdHandler({
  body: CreatePaymentMethodRequestBodySchema,
  response: CreatePaymentMethodResponseSchema,
  handle: ({ household, body }) => paymentMethodsService.createPaymentMethod(household, body),
  status: 'created',
});

export const update = createHouseholdHandler({
  params: UpdatePaymentMethodRequestParamsSchema,
  body: UpdatePaymentMethodRequestBodySchema,
  response: UpdatePaymentMethodResponseSchema,
  handle: ({ household, params, body }) =>
    paymentMethodsService.updatePaymentMethod(household, params.id, body),
});

export const deletePaymentMethod = createHouseholdHandler({
  params: DeletePaymentMethodRequestParamsSchema,
  status: 'no-content',
  handle: ({ household, params }) =>
    paymentMethodsService.deletePaymentMethod(household, params.id),
});
