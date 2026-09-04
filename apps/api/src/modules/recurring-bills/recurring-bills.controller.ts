import { recurringBillsEndpoints } from '@luraba/contracts/recurring-bills';
import { createHouseholdHandler } from '@/shared/controllers/household.controller';
import { withApiMeta } from '@/shared/response';
import * as service from './recurring-bills.service';

export const list = createHouseholdHandler({
  query: recurringBillsEndpoints.list.query,
  response: recurringBillsEndpoints.list.response,
  meta: recurringBillsEndpoints.list.meta,
  handle: async ({ household, query }) => {
    const result = await service.list(household, query);
    return withApiMeta(result.data, result.meta);
  },
});
export const get = createHouseholdHandler({
  params: recurringBillsEndpoints.get.params,
  response: recurringBillsEndpoints.get.response,
  handle: ({ household, params }) => service.get(household, params.id),
});
export const create = createHouseholdHandler({
  body: recurringBillsEndpoints.create.body,
  response: recurringBillsEndpoints.create.response,
  status: 'created',
  handle: ({ household, body }) => service.create(household, body),
});
export const update = createHouseholdHandler({
  params: recurringBillsEndpoints.update.params,
  body: recurringBillsEndpoints.update.body,
  response: recurringBillsEndpoints.update.response,
  handle: ({ household, params, body }) => service.update(household, params.id, body),
});
export const remove = createHouseholdHandler({
  params: recurringBillsEndpoints.delete.params,
  status: 'no-content',
  handle: ({ household, params }) => service.remove(household, params.id),
});
export const occurrences = createHouseholdHandler({
  params: recurringBillsEndpoints.occurrences.params,
  query: recurringBillsEndpoints.occurrences.query,
  response: recurringBillsEndpoints.occurrences.response,
  handle: ({ household, params, query }) =>
    service.listOccurrences(household, params.id, query.from, query.to),
});
export const skip = createHouseholdHandler({
  params: recurringBillsEndpoints.skip.params,
  status: 'no-content',
  handle: ({ household, params }) => service.skipOccurrence(household, params.id, params.date),
});
export const reschedule = createHouseholdHandler({
  params: recurringBillsEndpoints.reschedule.params,
  body: recurringBillsEndpoints.reschedule.body,
  status: 'no-content',
  handle: ({ household, params, body }) =>
    service.rescheduleOccurrence(household, params.id, params.date, body.date),
});
export const createOccurrence = createHouseholdHandler({
  params: recurringBillsEndpoints.createOccurrence.params,
  response: recurringBillsEndpoints.createOccurrence.response,
  handle: async ({ household, params }) => {
    const transaction = await service.createOccurrence(household, params.id, params.date);
    return recurringBillsEndpoints.createOccurrence.response.parse({
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
