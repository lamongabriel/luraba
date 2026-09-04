import { z } from "zod";
import { currencyCodeSchema, wireDateTimeSchema } from "../common.js";
import { tagSummarySchema } from "../tags/resource.js";

export const creditCardCycleStatusSchema = z.enum(["open", "closed", "paid"]);
export const creditCardCycleDisplayStatusSchema = z.enum([
  "current",
  "upcoming",
  "due",
  "overdue",
  "paid",
]);
export const creditCardCycleScopeSchema = z.enum(["default", "all"]);
export const baseCycleSchema = z.object({
  id: z.uuid(),
  creditCardId: z.uuid(),
  periodStart: z.iso.date(),
  periodEnd: z.iso.date(),
  closingDate: z.iso.date(),
  dueDate: z.iso.date(),
  status: creditCardCycleStatusSchema,
  statementAmount: z.number().int(),
  paidAmount: z.number().int(),
  remainingAmount: z.number().int(),
});
export const creditCardCycleSchema = baseCycleSchema.extend({
  displayStatus: creditCardCycleDisplayStatusSchema,
  isCurrent: z.boolean(),
  isNext: z.boolean(),
  hasActivity: z.boolean(),
});
export const creditCardCycleItemSchema = z.object({
  installmentId: z.uuid(),
  purchaseId: z.uuid(),
  transactionId: z.uuid(),
  description: z.string(),
  categoryId: z.uuid().nullable(),
  merchantId: z.uuid().nullable(),
  installmentNumber: z.number().int(),
  installmentCount: z.number().int(),
  amount: z.number().int(),
  purchaseDate: z.iso.date(),
  postedDate: z.iso.date(),
});
export const creditCardSchema = z.object({
  id: z.uuid(),
  ownerAccountId: z.uuid(),
  ledgerAccountId: z.uuid(),
  name: z.string(),
  institutionName: z.string().nullable(),
  institutionDomain: z.string().nullable(),
  institutionLogoUrl: z.string().nullable(),
  notes: z.string().nullable(),
  ownerAccount: z.object({
    id: z.uuid(),
    name: z.string(),
    institutionName: z.string().nullable(),
    institutionLogoUrl: z.string().nullable(),
    type: z.literal("cash"),
    classification: z.literal("asset"),
    currencyCode: currencyCodeSchema,
  }),
  classification: z.literal("liability"),
  type: z.literal("credit_card"),
  currencyCode: currencyCodeSchema,
  brand: z.string(),
  productType: z.literal("credit"),
  last4: z.string(),
  color: z.string().nullable(),
  closingDay: z.number().int(),
  dueDay: z.number().int(),
  creditLimitAmount: z.number().int(),
  remainingCreditAmount: z.number().int().nullable(),
  balance: z.number().int(),
  createdAt: wireDateTimeSchema,
  updatedAt: wireDateTimeSchema,
});
export const creditCardCycleDetailsSchema = z.object({
  cycle: creditCardCycleSchema,
  items: z.array(creditCardCycleItemSchema),
});
export const creditCardPurchaseSchema = z.object({
  purchaseId: z.uuid(),
  creditCardId: z.uuid(),
  transactionId: z.uuid(),
  description: z.string(),
  categoryId: z.uuid().nullable(),
  merchantId: z.uuid().nullable(),
  purchaseDate: z.iso.date(),
  postedDate: z.iso.date(),
  amount: z.number().int(),
  installmentCount: z.number().int(),
  tags: z.array(tagSummarySchema),
  includeInBudget: z.boolean(),
  budgetExpenseTiming: z.enum(["spend_month", "payment_month"]),
  budgetInstallmentMode: z.enum(["per_installment", "full_amount"]),
  installments: z.array(
    z.object({
      installmentId: z.uuid(),
      installmentNumber: z.number().int(),
      amount: z.number().int(),
      billingCycleId: z.uuid(),
      closingDate: z.iso.date(),
      dueDate: z.iso.date(),
    }),
  ),
  createdAt: wireDateTimeSchema,
});
export const creditCardPaymentSchema = z.object({
  paymentId: z.uuid(),
  creditCardId: z.uuid(),
  transactionId: z.uuid(),
  description: z.string(),
  paymentDate: z.iso.date(),
  postedDate: z.iso.date(),
  amount: z.number().int(),
  fromAccountId: z.uuid(),
  allocations: z.array(z.object({ billingCycleId: z.uuid(), amount: z.number().int() })),
  createdAt: wireDateTimeSchema,
});
export const creditCardForecastSchema = z.object({
  creditCardId: z.uuid(),
  fromMonth: z.string().regex(/^\d{4}-\d{2}$/),
  months: z.number().int(),
  cycles: z.array(creditCardCycleSchema.extend({ items: z.array(creditCardCycleItemSchema) })),
});

export type CreditCard = z.output<typeof creditCardSchema>;
export type CreditCardCycle = z.output<typeof creditCardCycleSchema>;
export type CreditCardCycleDetails = z.output<typeof creditCardCycleDetailsSchema>;
export type CreditCardPurchase = z.output<typeof creditCardPurchaseSchema>;
export type CreditCardPayment = z.output<typeof creditCardPaymentSchema>;
export type CreditCardForecast = z.output<typeof creditCardForecastSchema>;
export type CreditCardCycleStatus = z.output<typeof creditCardCycleStatusSchema>;
export type CreditCardCycleDisplayStatus = z.output<typeof creditCardCycleDisplayStatusSchema>;
