import { z } from "zod";
import { defineEndpoint } from "../api.js";
import { listMetaSchema } from "../list.js";
import { getCurrencyRateQuerySchema, listCurrenciesQuerySchema } from "./requests.js";
import { currencyRateSchema, currencySchema } from "./resource.js";

export const currenciesEndpoints = {
  list: defineEndpoint({
    method: "get",
    path: "/currencies",
    query: listCurrenciesQuerySchema,
    response: z.array(currencySchema),
    meta: listMetaSchema(),
    status: 200,
  }),
  rate: defineEndpoint({
    method: "get",
    path: "/currencies/rate",
    query: getCurrencyRateQuerySchema,
    response: currencyRateSchema,
    status: 200,
  }),
} as const;
