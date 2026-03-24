import { NextFunction, Request, Response } from 'express';
import { getAuthenticatedUser } from '@/middleware/auth.middleware';
import { sendCreated, sendSuccess } from '@/shared/response';
import * as merchantsService from './merchants.service';
import { createMerchantSchema } from './merchants.types';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getAuthenticatedUser(req);
    const dto = createMerchantSchema.parse(req.body);
    const merchant = await merchantsService.createMerchant(user.id, dto);
    sendCreated(res, merchant);
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getAuthenticatedUser(req);
    const merchants = await merchantsService.listMerchants(user.id);
    sendSuccess(res, merchants);
  } catch (err) {
    next(err);
  }
}