import { fxEndpoints } from "@luraba/contracts/fx";
import { createHouseholdHandler } from "@/shared/controllers/household.controller";
import { buildCombinedFx } from "./fx-combine.service";
import * as overridesService from "./fx-overrides.service";

export const rates = createHouseholdHandler({
  query: fxEndpoints.rates.query,
  response: fxEndpoints.rates.response,
  handle: ({ household, query }) => buildCombinedFx(household, query.currencies),
});

export const listOverrides = createHouseholdHandler({
  response: fxEndpoints.listOverrides.response,
  handle: ({ household }) => overridesService.listOverrides(household),
});

export const setOverride = createHouseholdHandler({
  body: fxEndpoints.setOverride.body,
  response: fxEndpoints.setOverride.response,
  handle: ({ household, body }) => overridesService.setOverride(household, body),
});

export const deleteOverride = createHouseholdHandler({
  params: fxEndpoints.deleteOverride.params,
  status: "no-content",
  handle: ({ household, params }) =>
    overridesService.deleteOverride(household, params.fromCurrencyCode, params.toCurrencyCode),
});
