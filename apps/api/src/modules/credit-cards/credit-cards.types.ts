import type {
  baseCycleSchema,
  createCreditCardInputSchema,
  createCreditCardPaymentInputSchema,
  createCreditCardPurchaseInputSchema,
  creditCardCycleDetailsSchema,
  creditCardCycleItemSchema,
  creditCardCycleSchema,
  creditCardForecastQuerySchema,
  creditCardForecastSchema,
  creditCardPaymentSchema,
  creditCardPurchaseSchema,
  creditCardSchema,
  updateCreditCardCycleInputSchema,
  updateCreditCardInputSchema,
  updateCreditCardPaymentInputSchema,
  updateCreditCardPurchaseInputSchema,
} from '@luraba/contracts/credit-cards';
import type { z } from 'zod';

/** Service-facing values retain input compatibility until the controller parses them. */
export type CreditCardResponse = z.input<typeof creditCardSchema>;
export type BaseCreditCardCycleSummary = z.input<typeof baseCycleSchema>;
export type CreditCardCycleSummary = z.input<typeof creditCardCycleSchema>;
export type CreditCardCycleItem = z.input<typeof creditCardCycleItemSchema>;
export type CreditCardCycleDetailResponse = z.input<typeof creditCardCycleDetailsSchema>;
export type CreditCardPurchaseResponse = z.input<typeof creditCardPurchaseSchema>;
export type CreditCardPaymentResponse = z.input<typeof creditCardPaymentSchema>;
export type CreditCardForecastResponse = z.input<typeof creditCardForecastSchema>;
export type ListCreditCardsResponse = z.input<typeof creditCardSchema>[];
export type CreateCreditCardDto = z.output<typeof createCreditCardInputSchema>;
export type UpdateCreditCardDto = z.output<typeof updateCreditCardInputSchema>;
export type UpdateCreditCardCycleDto = z.output<typeof updateCreditCardCycleInputSchema>;
export type CreateCreditCardPurchaseDto = z.output<typeof createCreditCardPurchaseInputSchema>;
export type UpdateCreditCardPurchaseDto = z.output<typeof updateCreditCardPurchaseInputSchema>;
export type CreateCreditCardPaymentDto = z.output<typeof createCreditCardPaymentInputSchema>;
export type UpdateCreditCardPaymentDto = z.output<typeof updateCreditCardPaymentInputSchema>;
export type CreditCardForecastQuery = z.output<typeof creditCardForecastQuerySchema>;
