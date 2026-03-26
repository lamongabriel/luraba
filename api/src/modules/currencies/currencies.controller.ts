import { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '@/shared/response';
import * as currenciesService from './currencies.service';

export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const currencies = await currenciesService.listCurrencies();
    sendSuccess(res, currencies);
  } catch (err) {
    next(err);
  }
}
