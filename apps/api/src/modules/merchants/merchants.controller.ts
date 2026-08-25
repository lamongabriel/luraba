import { createHouseholdHandler } from '@/shared/controllers/household.controller';
import { withApiMeta } from '@/shared/response';
import { ListMerchantsRequestQuerySchema } from './merchants.query';
import * as merchantsService from './merchants.service';
import {
  CreateMerchantRequestBodySchema,
  CreateMerchantResponseSchema,
  DeleteMerchantRequestParamsSchema,
  ListMerchantsResponseSchema,
  UpdateMerchantRequestBodySchema,
  UpdateMerchantRequestParamsSchema,
  UpdateMerchantResponseSchema,
} from './merchants.types';

export const create = createHouseholdHandler({
  body: CreateMerchantRequestBodySchema,
  response: CreateMerchantResponseSchema,
  handle: ({ household, body }) => merchantsService.createMerchant(household, body),
  status: 'created',
});

export const list = createHouseholdHandler({
  query: ListMerchantsRequestQuerySchema,
  response: ListMerchantsResponseSchema,
  handle: async ({ household, query }) => {
    const result = await merchantsService.listMerchants(household, query);
    return withApiMeta(result.data, result.meta);
  },
});

export const details = createHouseholdHandler({
  params: UpdateMerchantRequestParamsSchema,
  response: CreateMerchantResponseSchema,
  handle: ({ household, params }) => merchantsService.getMerchant(household, params.id),
});

export const update = createHouseholdHandler({
  params: UpdateMerchantRequestParamsSchema,
  body: UpdateMerchantRequestBodySchema,
  response: UpdateMerchantResponseSchema,
  handle: ({ household, params, body }) =>
    merchantsService.updateMerchant(household, params.id, body),
});

export const deleteMerchant = createHouseholdHandler({
  params: DeleteMerchantRequestParamsSchema,
  status: 'no-content',
  handle: ({ household, params }) => merchantsService.deleteMerchant(household, params.id),
});
