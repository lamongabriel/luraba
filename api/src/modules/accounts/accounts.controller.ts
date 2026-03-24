import { NextFunction, Request, Response } from 'express';
import { getAuthenticatedUser } from '@/middleware/auth.middleware';
import { sendCreated, sendSuccess } from '@/shared/response';
import * as accountsService from './accounts.service';
import { createAccountSchema } from './accounts.types';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getAuthenticatedUser(req);
    const dto = createAccountSchema.parse(req.body);
    const account = await accountsService.createAccount(user.id, dto);
    sendCreated(res, account);
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getAuthenticatedUser(req);
    const accounts = await accountsService.listAccounts(user.id);
    sendSuccess(res, accounts);
  } catch (err) {
    next(err);
  }
}