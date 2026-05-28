import { createHouseholdHandler } from '@/shared/controllers/household.controller';
import * as merchantsService from './merchants.service';
import {
  CreateMerchantRequestBodySchema,
  CreateMerchantResponseSchema,
  ListMerchantsResponseSchema,
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
