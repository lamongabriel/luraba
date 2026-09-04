import { merchantsEndpoints } from '@luraba/contracts/merchants';
import { createHouseholdHandler } from '@/shared/controllers/household.controller';
import { withApiMeta } from '@/shared/response';
import * as merchantsService from './merchants.service';

export const create = createHouseholdHandler({
  body: merchantsEndpoints.create.body,
  response: merchantsEndpoints.create.response,
  handle: ({ household, body }) => merchantsService.createMerchant(household, body),
  status: 'created',
});

export const list = createHouseholdHandler({
  query: merchantsEndpoints.list.query,
  response: merchantsEndpoints.list.response,
  meta: merchantsEndpoints.list.meta,
  handle: async ({ household, query }) => {
    const result = await merchantsService.listMerchants(household, query);
    return withApiMeta(result.data, result.meta);
  },
});

export const details = createHouseholdHandler({
  params: merchantsEndpoints.get.params,
  response: merchantsEndpoints.get.response,
  handle: ({ household, params }) => merchantsService.getMerchant(household, params.id),
});

export const update = createHouseholdHandler({
  params: merchantsEndpoints.update.params,
  body: merchantsEndpoints.update.body,
  response: merchantsEndpoints.update.response,
  handle: ({ household, params, body }) =>
    merchantsService.updateMerchant(household, params.id, body),
});

export const deleteMerchant = createHouseholdHandler({
  params: merchantsEndpoints.delete.params,
  status: 'no-content',
  handle: ({ household, params }) => merchantsService.deleteMerchant(household, params.id),
});
