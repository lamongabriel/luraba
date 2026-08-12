import { z } from 'zod';
import { createHouseholdHandler } from '@/shared/controllers/household.controller';
import { withApiMeta } from '@/shared/response';
import * as service from './recurring-bills.service';
import {
  createRecurringBillBodySchema,
  listRecurringBillsQuerySchema,
  occurrenceParamsSchema,
  recurringBillParamsSchema,
  recurringBillSchema,
  recurringOccurrenceSchema,
  rescheduleOccurrenceBodySchema,
  updateRecurringBillBodySchema,
} from './recurring-bills.types';

export const list = createHouseholdHandler({
  query: listRecurringBillsQuerySchema,
  response: recurringBillSchema.array(),
  handle: async ({ household, query }) => {
    const result = await service.list(household, query);
    return withApiMeta(result.data, result.meta);
  },
});
export const get = createHouseholdHandler({
  params: recurringBillParamsSchema,
  response: recurringBillSchema,
  handle: ({ household, params }) => service.get(household, params.id),
});
export const create = createHouseholdHandler({
  body: createRecurringBillBodySchema,
  response: recurringBillSchema,
  status: 'created',
  handle: ({ household, body }) => service.create(household, body),
});
export const update = createHouseholdHandler({
  params: recurringBillParamsSchema,
  body: updateRecurringBillBodySchema,
  response: recurringBillSchema,
  handle: ({ household, params, body }) => service.update(household, params.id, body),
});
export const remove = createHouseholdHandler({
  params: recurringBillParamsSchema,
  status: 'no-content',
  handle: ({ household, params }) => service.remove(household, params.id),
});
export const occurrences = createHouseholdHandler({
  params: recurringBillParamsSchema,
  query: listRecurringBillsQuerySchema.pick({ search: true }).extend({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  response: recurringOccurrenceSchema.array(),
  handle: ({ household, params, query }) =>
    service.listOccurrences(household, params.id, query.from, query.to),
});
export const skip = createHouseholdHandler({
  params: occurrenceParamsSchema,
  status: 'no-content',
  handle: ({ household, params }) => service.skipOccurrence(household, params.id, params.date),
});
export const reschedule = createHouseholdHandler({
  params: occurrenceParamsSchema,
  body: rescheduleOccurrenceBodySchema,
  status: 'no-content',
  handle: ({ household, params, body }) =>
    service.rescheduleOccurrence(household, params.id, params.date, body.date),
});
export const createOccurrence = createHouseholdHandler({
  params: occurrenceParamsSchema,
  response: recurringOccurrenceSchema,
  handle: async ({ household, params }) => {
    const transaction = await service.createOccurrence(household, params.id, params.date);
    return recurringOccurrenceSchema.parse({
      id: `${params.id}:${params.date}`,
      recurringBillId: params.id,
      occurrenceDate: params.date,
      effectiveDate: params.date,
      status: 'created',
      rescheduledDate: null,
      transactionId: transaction.id,
    });
  },
});
