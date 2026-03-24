import { NextFunction, Request, Response } from 'express';
import { getAuthenticatedUser } from '@/middleware/auth.middleware';
import { sendCreated, sendSuccess } from '@/shared/response';
import * as transactionsService from './transactions.service';
import { createTransactionSchema } from './transactions.types';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getAuthenticatedUser(req);
    const dto = createTransactionSchema.parse(req.body);
    const result = await transactionsService.createTransaction(user.id, dto);
    sendCreated(res, result);
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getAuthenticatedUser(req);
    const transactions = await transactionsService.listTransactions(user.id);
    sendSuccess(res, transactions);
  } catch (err) {
    next(err);
  }
}