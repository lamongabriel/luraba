import { z } from "zod";
import { defineEndpoint } from "../api.js";
import {
  combinedFxQuerySchema,
  fxOverrideParamsSchema,
  setFxOverrideBodySchema,
} from "./requests.js";
import { combinedFxSchema, fxOverrideSchema } from "./resource.js";

export const fxEndpoints = {
  /** The latest rates from the listed currencies to the household base currency (for combined totals). */
  rates: defineEndpoint({
    method: "get",
    path: "/fx/rates",
    query: combinedFxQuerySchema,
    response: combinedFxSchema,
    status: 200,
  }),
  listOverrides: defineEndpoint({
    method: "get",
    path: "/fx/overrides",
    response: z.array(fxOverrideSchema),
    status: 200,
  }),
  /** Pins the rate for a pair; it wins over the market rate until removed. */
  setOverride: defineEndpoint({
    method: "put",
    path: "/fx/overrides",
    body: setFxOverrideBodySchema,
    response: fxOverrideSchema,
    status: 200,
  }),
  deleteOverride: defineEndpoint({
    method: "delete",
    path: "/fx/overrides/:fromCurrencyCode/:toCurrencyCode",
    params: fxOverrideParamsSchema,
    status: 204,
  }),
} as const;
