import { createHouseholdHandler } from '@/shared/controllers/household.controller';
import * as currenciesService from './currencies.service';
import {
  GetCurrencyRateRequestQuerySchema,
  GetCurrencyRateResponseSchema,
  ListCurrenciesResponseSchema,
} from './currencies.types';

export const list = createHouseholdHandler({
  response: ListCurrenciesResponseSchema,
  handle: () => currenciesService.listCurrencies(),
});

export const rate = createHouseholdHandler({
  query: GetCurrencyRateRequestQuerySchema,
  response: GetCurrencyRateResponseSchema,
  handle: ({ query }) => currenciesService.getCurrencyRate(query),
});
