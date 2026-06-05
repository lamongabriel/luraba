import { createHouseholdHandler } from '@/shared/controllers/household.controller';
import * as budgetsService from './budgets.service';
import {
  GetMonthlyBudgetRequestParamsSchema,
  GetMonthlyBudgetRequestQuerySchema,
  GetMonthlyBudgetResponseSchema,
  parseBudgetMonthKey,
  ReplaceMonthlyBudgetRequestBodySchema,
  ReplaceMonthlyBudgetRequestParamsSchema,
  ReplaceMonthlyBudgetResponseSchema,
} from './budgets.types';

export const getMonth = createHouseholdHandler({
  params: GetMonthlyBudgetRequestParamsSchema,
  query: GetMonthlyBudgetRequestQuerySchema,
  response: GetMonthlyBudgetResponseSchema,
  handle: ({ household, params, query }) =>
    budgetsService.getMonthlyBudget(
      household,
      parseBudgetMonthKey(params.month),
      query.displayCurrencyCode,
    ),
});

export const replaceMonth = createHouseholdHandler({
  params: ReplaceMonthlyBudgetRequestParamsSchema,
  body: ReplaceMonthlyBudgetRequestBodySchema,
  response: ReplaceMonthlyBudgetResponseSchema,
  handle: ({ household, params, body }) =>
    budgetsService.replaceMonthlyBudget(household, parseBudgetMonthKey(params.month), body),
});
