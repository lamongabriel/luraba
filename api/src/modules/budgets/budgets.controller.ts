import { NextFunction, Request, Response } from 'express';
import { getAuthenticatedUser } from '@/middleware/auth.middleware';
import { sendSuccess } from '@/shared/response';
import * as budgetsService from './budgets.service';
import { budgetMonthParamSchema, budgetQuerySchema, parseMonthKey, replaceBudgetSchema } from './budgets.types';

export async function getMonth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getAuthenticatedUser(req);
    const { month } = budgetMonthParamSchema.parse(req.params);
    const query = budgetQuerySchema.parse(req.query);
    const data = await budgetsService.getMonthlyBudget(user.id, parseMonthKey(month), query.currencyCode);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function replaceMonth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getAuthenticatedUser(req);
    const { month } = budgetMonthParamSchema.parse(req.params);
    const dto = replaceBudgetSchema.parse(req.body);
    const data = await budgetsService.replaceMonthlyBudget(user.id, parseMonthKey(month), dto);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}
