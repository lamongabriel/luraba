import { z } from "zod";
import {
  currencyCodeSchema,
  dateInputSchema,
  institutionDomainInputSchema,
  moneyAmountSchema,
} from "../common.js";
import {
  booleanQuerySchema,
  commaSeparatedArraySchema,
  createListQuerySchema,
  dateQuerySchema,
  temporalQuerySchema,
  validateRange,
} from "../list.js";
import {
  creditCardCycleDisplayStatusSchema,
  creditCardCycleScopeSchema,
  creditCardCycleStatusSchema,
} from "./resource.js";

const daySchema = z.number().int().min(1).max(31);
const installmentCountSchema = z.coerce.number().int().min(1).max(60);
const creditLimitSchema = z.coerce.number().int().min(-1);
export const creditCardIdParamsSchema = z.object({ id: z.uuid() });
export const creditCardCycleParamsSchema = z.object({ id: z.uuid(), cycleId: z.uuid() });
export const creditCardPurchaseParamsSchema = z.object({ id: z.uuid(), purchaseId: z.uuid() });
export const creditCardPaymentParamsSchema = z.object({ id: z.uuid(), paymentId: z.uuid() });
export const createCreditCardInputSchema = z.object({
  name: z.string().min(1).max(255),
  ownerAccountId: z.uuid(),
  institutionName: z.string().min(1).max(255).optional(),
  institutionDomain: institutionDomainInputSchema.optional(),
  notes: z.string().max(4000).optional(),
  brand: z.string().min(1).max(64),
  productType: z.literal("credit").optional(),
  last4: z.string().regex(/^\d{4}$/, "Last 4 digits must be exactly 4 numeric characters"),
  color: z.string().min(1).max(32).optional(),
  closingDay: daySchema,
  dueDay: daySchema,
  creditLimitAmount: creditLimitSchema.optional(),
});
export const updateCreditCardInputSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  institutionName: z.string().min(1).max(255).nullable().optional(),
  institutionDomain: institutionDomainInputSchema.nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  brand: z.string().min(1).max(64).optional(),
  productType: z.literal("credit").optional(),
  last4: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
  color: z.string().min(1).max(32).nullable().optional(),
  closingDay: daySchema.optional(),
  dueDay: daySchema.optional(),
  creditLimitAmount: creditLimitSchema.optional(),
});
export const updateCreditCardCycleInputSchema = z
  .object({ closingDate: dateInputSchema.optional(), dueDate: dateInputSchema.optional() })
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    "At least one cycle date must be provided",
  )
  .superRefine((value, ctx) => {
    if (value.closingDate && value.dueDate && value.closingDate > value.dueDate)
      ctx.addIssue({
        code: "custom",
        path: ["dueDate"],
        message: "dueDate must be on or after closingDate",
      });
  });
export const createCreditCardPurchaseInputSchema = z.object({
  description: z.string().min(1).max(512),
  amount: moneyAmountSchema,
  categoryId: z.uuid().nullable().optional(),
  merchantId: z.uuid().optional(),
  purchaseDate: dateInputSchema,
  postedDate: dateInputSchema.optional(),
  installmentCount: installmentCountSchema.default(1),
  tagIds: z.array(z.uuid()).max(50).optional(),
  includeInBudget: z.boolean().default(true),
});
export const updateCreditCardPurchaseInputSchema = createCreditCardPurchaseInputSchema
  .partial()
  .extend({ merchantId: z.uuid().nullable().optional() })
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    "At least one purchase field must be provided",
  );
export const createCreditCardPaymentInputSchema = z.object({
  description: z.string().min(1).max(512).optional(),
  amount: moneyAmountSchema,
  fromAccountId: z.uuid(),
  paymentDate: dateInputSchema,
  postedDate: dateInputSchema.optional(),
});
export const updateCreditCardPaymentInputSchema = createCreditCardPaymentInputSchema
  .partial()
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    "At least one payment field must be provided",
  );
export const creditCardForecastQuerySchema = z.object({
  fromMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "fromMonth must use YYYY-MM format")
    .optional(),
  months: z.coerce.number().int().min(1).max(24).default(12),
});
export const listCreditCardsQuerySchema = createListQuerySchema(
  {
    brands: commaSeparatedArraySchema(z.string().trim().min(1).max(64)),
    currencyCodes: commaSeparatedArraySchema(currencyCodeSchema),
    ownerAccountIds: commaSeparatedArraySchema(z.uuid()),
    closingDays: commaSeparatedArraySchema(z.coerce.number().int().min(1).max(31)),
    dueDays: commaSeparatedArraySchema(z.coerce.number().int().min(1).max(31)),
    balanceMin: z.coerce.number().int().optional(),
    balanceMax: z.coerce.number().int().optional(),
    creditLimitMin: z.coerce.number().int().min(0).optional(),
    creditLimitMax: z.coerce.number().int().min(0).optional(),
    hasCreditLimit: booleanQuerySchema.optional(),
    createdAtFrom: temporalQuerySchema.optional(),
    createdAtTo: temporalQuerySchema.optional(),
    updatedAtFrom: temporalQuerySchema.optional(),
    updatedAtTo: temporalQuerySchema.optional(),
  },
  [
    "name",
    "institutionName",
    "brand",
    "last4",
    "currencyCode",
    "balance",
    "creditLimitAmount",
    "closingDay",
    "dueDay",
    "createdAt",
    "updatedAt",
  ],
).superRefine((query, ctx) => {
  validateRange(query, ctx, "balanceMin", "balanceMax");
  validateRange(query, ctx, "creditLimitMin", "creditLimitMax");
  validateRange(query, ctx, "createdAtFrom", "createdAtTo");
  validateRange(query, ctx, "updatedAtFrom", "updatedAtTo");
});
export const listCreditCardCyclesQuerySchema = createListQuerySchema(
  {
    scope: creditCardCycleScopeSchema.default("default"),
    statuses: commaSeparatedArraySchema(creditCardCycleStatusSchema),
    displayStatuses: commaSeparatedArraySchema(creditCardCycleDisplayStatusSchema),
    closingDateFrom: dateQuerySchema.optional(),
    closingDateTo: dateQuerySchema.optional(),
    dueDateFrom: dateQuerySchema.optional(),
    dueDateTo: dateQuerySchema.optional(),
    statementAmountMin: z.coerce.number().int().optional(),
    statementAmountMax: z.coerce.number().int().optional(),
    paidAmountMin: z.coerce.number().int().optional(),
    paidAmountMax: z.coerce.number().int().optional(),
    remainingAmountMin: z.coerce.number().int().optional(),
    remainingAmountMax: z.coerce.number().int().optional(),
  },
  [
    "periodStart",
    "periodEnd",
    "closingDate",
    "dueDate",
    "status",
    "displayStatus",
    "statementAmount",
    "paidAmount",
    "remainingAmount",
  ],
).superRefine((query, ctx) => {
  validateRange(query, ctx, "closingDateFrom", "closingDateTo");
  validateRange(query, ctx, "dueDateFrom", "dueDateTo");
  validateRange(query, ctx, "statementAmountMin", "statementAmountMax");
  validateRange(query, ctx, "paidAmountMin", "paidAmountMax");
  validateRange(query, ctx, "remainingAmountMin", "remainingAmountMax");
});

export type ListCreditCardsQuery = z.input<typeof listCreditCardsQuerySchema>;
export type ListCreditCardCyclesQuery = z.input<typeof listCreditCardCyclesQuerySchema>;
export type CreditCardForecastQuery = z.input<typeof creditCardForecastQuerySchema>;
export type CreateCreditCardInput = z.input<typeof createCreditCardInputSchema>;
export type UpdateCreditCardInput = z.input<typeof updateCreditCardInputSchema>;
export type UpdateCreditCardCycleInput = z.input<typeof updateCreditCardCycleInputSchema>;
export type CreateCreditCardPurchaseInput = z.input<typeof createCreditCardPurchaseInputSchema>;
export type UpdateCreditCardPurchaseInput = z.input<typeof updateCreditCardPurchaseInputSchema>;
export type CreateCreditCardPaymentInput = z.input<typeof createCreditCardPaymentInputSchema>;
export type UpdateCreditCardPaymentInput = z.input<typeof updateCreditCardPaymentInputSchema>;
