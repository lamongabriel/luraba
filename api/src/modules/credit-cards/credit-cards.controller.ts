import type { NextFunction, Request, Response } from 'express';
import { getHouseholdContext } from '@/middleware/access.middleware';
import { sendCreated, sendSuccess } from '@/shared/response';
import * as creditCardsService from './credit-cards.service';
import {
  createCreditCardPaymentSchema,
  createCreditCardPurchaseSchema,
  createCreditCardSchema,
  creditCardCycleIdParamSchema,
  creditCardForecastQuerySchema,
  creditCardIdParamSchema,
  updateCreditCardCycleSchema,
  updateCreditCardSchema,
} from './credit-cards.types';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const household = getHouseholdContext(req);
    const cards = await creditCardsService.listCreditCards(household);
    sendSuccess(res, cards);
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const household = getHouseholdContext(req);
    const dto = createCreditCardSchema.parse(req.body);
    const card = await creditCardsService.createCreditCard(household, dto);
    sendCreated(res, card);
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const household = getHouseholdContext(req);
    const { id } = creditCardIdParamSchema.parse(req.params);
    const card = await creditCardsService.getCreditCard(household, id);
    sendSuccess(res, card);
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const household = getHouseholdContext(req);
    const { id } = creditCardIdParamSchema.parse(req.params);
    const dto = updateCreditCardSchema.parse(req.body);
    const card = await creditCardsService.updateCreditCard(household, id, dto);
    sendSuccess(res, card);
  } catch (error) {
    next(error);
  }
}

export async function listCycles(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const household = getHouseholdContext(req);
    const { id } = creditCardIdParamSchema.parse(req.params);
    const cycles = await creditCardsService.listBillingCycles(household, id);
    sendSuccess(res, cycles);
  } catch (error) {
    next(error);
  }
}

export async function getCycle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const household = getHouseholdContext(req);
    const { id, cycleId } = creditCardCycleIdParamSchema.parse(req.params);
    const cycle = await creditCardsService.getBillingCycle(household, id, cycleId);
    sendSuccess(res, cycle);
  } catch (error) {
    next(error);
  }
}

export async function updateCycle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const household = getHouseholdContext(req);
    const { id, cycleId } = creditCardCycleIdParamSchema.parse(req.params);
    const dto = updateCreditCardCycleSchema.parse(req.body);
    const cycle = await creditCardsService.updateBillingCycle(household, id, cycleId, dto);
    sendSuccess(res, cycle);
  } catch (error) {
    next(error);
  }
}

export async function createPurchase(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const household = getHouseholdContext(req);
    const { id } = creditCardIdParamSchema.parse(req.params);
    const dto = createCreditCardPurchaseSchema.parse(req.body);
    const purchase = await creditCardsService.createPurchase(household, id, dto);
    sendCreated(res, purchase);
  } catch (error) {
    next(error);
  }
}

export async function createPayment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const household = getHouseholdContext(req);
    const { id } = creditCardIdParamSchema.parse(req.params);
    const dto = createCreditCardPaymentSchema.parse(req.body);
    const payment = await creditCardsService.createPayment(household, id, dto);
    sendCreated(res, payment);
  } catch (error) {
    next(error);
  }
}

export async function getForecast(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const household = getHouseholdContext(req);
    const { id } = creditCardIdParamSchema.parse(req.params);
    const query = creditCardForecastQuerySchema.parse(req.query);
    const forecast = await creditCardsService.getForecast(household, id, query);
    sendSuccess(res, forecast);
  } catch (error) {
    next(error);
  }
}
