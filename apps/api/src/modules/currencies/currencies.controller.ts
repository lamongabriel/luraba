import { currenciesEndpoints } from "@luraba/contracts/currencies";
import { createHouseholdHandler } from "@/shared/controllers/household.controller";
import { withApiMeta } from "@/shared/response";
import * as currenciesService from "./currencies.service";

export const list = createHouseholdHandler({
  query: currenciesEndpoints.list.query,
  response: currenciesEndpoints.list.response,
  meta: currenciesEndpoints.list.meta,
  handle: async ({ query }) => {
    const result = await currenciesService.listCurrencies(query);
    return withApiMeta(result.data, result.meta);
  },
});

export const rate = createHouseholdHandler({
  query: currenciesEndpoints.rate.query,
  response: currenciesEndpoints.rate.response,
  handle: ({ query }) => currenciesService.getCurrencyRate(query),
});
