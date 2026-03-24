import { NextFunction, Request, Response } from 'express';
import { getAuthenticatedUser } from '@/middleware/auth.middleware';
import { sendCreated, sendSuccess } from '@/shared/response';
import * as creditCardsService from './credit-cards.service';
import { cardIdParamSchema, createCreditCardSchema } from './credit-cards.types';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getAuthenticatedUser(req);
    const dto = createCreditCardSchema.parse(req.body);
    const card = await creditCardsService.createCreditCard(user.id, dto);
    sendCreated(res, card);
  } catch (err) {
    next(err);
  }
}

export async function overview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getAuthenticatedUser(req);
    const { id } = cardIdParamSchema.parse(req.params);
    const data = await creditCardsService.getCardOverview(id, user.id);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}