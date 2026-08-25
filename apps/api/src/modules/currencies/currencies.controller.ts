import { createHouseholdHandler } from '@/shared/controllers/household.controller';
import { withApiMeta } from '@/shared/response';
import { ListCurrenciesRequestQuerySchema } from './currencies.query';
import * as currenciesService from './currencies.service';
import {
  GetCurrencyRateRequestQuerySchema,
  GetCurrencyRateResponseSchema,
  ListCurrenciesResponseSchema,
} from './currencies.types';

export const list = createHouseholdHandler({
  query: ListCurrenciesRequestQuerySchema,
  response: ListCurrenciesResponseSchema,
  handle: async ({ query }) => {
    const result = await currenciesService.listCurrencies(query);
    return withApiMeta(result.data, result.meta);
  },
});

export const rate = createHouseholdHandler({
  query: GetCurrencyRateRequestQuerySchema,
  response: GetCurrencyRateResponseSchema,
  handle: ({ query }) => currenciesService.getCurrencyRate(query),
});
