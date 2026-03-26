import { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '@/shared/response';
import * as paymentMethodsService from './payment-methods.service';
import { listPaymentMethodsQuerySchema } from './payment-methods.types';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = listPaymentMethodsQuerySchema.parse(req.query);
    const methods = await paymentMethodsService.listPaymentMethods(query);
    sendSuccess(res, methods);
  } catch (err) {
    next(err);
  }
}
