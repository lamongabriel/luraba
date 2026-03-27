import { NextFunction, Request, Response } from 'express';
import { getAuthenticatedUser } from '@/middleware/auth.middleware';
import { sendCreated, sendSuccess } from '@/shared/response';
import * as creditCardsService from './credit-cards.service';
import {
  createCreditCardPaymentSchema,
  createCreditCardPurchaseSchema,
  createCreditCardSchema,
  creditCardCycleIdParamSchema,
  creditCardForecastQuerySchema,
  creditCardIdParamSchema,
  updateCreditCardSchema,
  updateCreditCardCycleSchema,
} from './credit-cards.types';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getAuthenticatedUser(req);
    const cards = await creditCardsService.listCreditCards(user.id);
    sendSuccess(res, cards);
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getAuthenticatedUser(req);
    const dto = createCreditCardSchema.parse(req.body);
    const card = await creditCardsService.createCreditCard(user.id, dto);
    sendCreated(res, card);
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getAuthenticatedUser(req);
    const { id } = creditCardIdParamSchema.parse(req.params);
    const card = await creditCardsService.getCreditCard(user.id, id);
    sendSuccess(res, card);
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getAuthenticatedUser(req);
    const { id } = creditCardIdParamSchema.parse(req.params);
    const dto = updateCreditCardSchema.parse(req.body);
    const card = await creditCardsService.updateCreditCard(user.id, id, dto);
    sendSuccess(res, card);
  } catch (error) {
    next(error);
  }
}

export async function listCycles(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getAuthenticatedUser(req);
    const { id } = creditCardIdParamSchema.parse(req.params);
    const cycles = await creditCardsService.listBillingCycles(user.id, id);
    sendSuccess(res, cycles);
  } catch (error) {
    next(error);
  }
}

export async function getCycle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getAuthenticatedUser(req);
    const { id, cycleId } = creditCardCycleIdParamSchema.parse(req.params);
    const cycle = await creditCardsService.getBillingCycle(user.id, id, cycleId);
    sendSuccess(res, cycle);
  } catch (error) {
    next(error);
  }
}

export async function updateCycle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getAuthenticatedUser(req);
    const { id, cycleId } = creditCardCycleIdParamSchema.parse(req.params);
    const dto = updateCreditCardCycleSchema.parse(req.body);
    const cycle = await creditCardsService.updateBillingCycle(user.id, id, cycleId, dto);
    sendSuccess(res, cycle);
  } catch (error) {
    next(error);
  }
}

export async function createPurchase(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getAuthenticatedUser(req);
    const { id } = creditCardIdParamSchema.parse(req.params);
    const dto = createCreditCardPurchaseSchema.parse(req.body);
    const purchase = await creditCardsService.createPurchase(user.id, id, dto);
    sendCreated(res, purchase);
  } catch (error) {
    next(error);
  }
}

export async function createPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getAuthenticatedUser(req);
    const { id } = creditCardIdParamSchema.parse(req.params);
    const dto = createCreditCardPaymentSchema.parse(req.body);
    const payment = await creditCardsService.createPayment(user.id, id, dto);
    sendCreated(res, payment);
  } catch (error) {
    next(error);
  }
}

export async function getForecast(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getAuthenticatedUser(req);
    const { id } = creditCardIdParamSchema.parse(req.params);
    const query = creditCardForecastQuerySchema.parse(req.query);
    const forecast = await creditCardsService.getForecast(user.id, id, query);
    sendSuccess(res, forecast);
  } catch (error) {
    next(error);
  }
}
