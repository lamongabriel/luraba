import { createHouseholdHandler } from '@/shared/controllers/household.controller';
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
  response: ListMerchantsResponseSchema,
  handle: ({ household }) => merchantsService.listMerchants(household),
});

export const update = createHouseholdHandler({
  params: UpdateMerchantRequestParamsSchema,
  body: UpdateMerchantRequestBodySchema,
  response: UpdateMerchantResponseSchema,
  handle: ({ household, params, body }) => merchantsService.updateMerchant(household, params.id, body),
});

export const deleteMerchant = createHouseholdHandler({
  params: DeleteMerchantRequestParamsSchema,
  status: 'no-content',
  handle: ({ household, params }) => merchantsService.deleteMerchant(household, params.id),
});
