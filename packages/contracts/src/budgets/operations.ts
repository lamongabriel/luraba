import type { EndpointParams, EndpointResult } from "../api.js";
import type { budgetsEndpoints } from "./endpoints.js";
import type {
  GetMonthlyBudgetQuery,
  ReplaceMonthlyBudgetInput,
  UpdateBudgetMonthSettingsInput,
} from "./requests.js";

export type { GetMonthlyBudgetQuery, ReplaceMonthlyBudgetInput, UpdateBudgetMonthSettingsInput };
export type GetMonthlyBudgetParams = EndpointParams<typeof budgetsEndpoints.getMonth>;
export type ReplaceMonthlyBudgetParams = EndpointParams<typeof budgetsEndpoints.replaceMonth>;
export type GetMonthlyBudgetResult = EndpointResult<typeof budgetsEndpoints.getMonth>;
export type ReplaceMonthlyBudgetResult = EndpointResult<typeof budgetsEndpoints.replaceMonth>;
export type UpdateBudgetMonthSettingsParams = EndpointParams<
  typeof budgetsEndpoints.updateMonthSettings
>;
export type UpdateBudgetMonthSettingsResult = EndpointResult<
  typeof budgetsEndpoints.updateMonthSettings
>;
