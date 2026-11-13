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
  notesSchema,
  originalDescriptionSchema,
  transactionTextFields,
} from "../transactions/requests.js";
import {
  creditCardCycleDisplayStatusSchema,
  creditCardCycleScopeSchema,
  creditCardCycleStatusSchema,
} from "./resource.js";

const daySchema = z.number().int().min(1).max(31);
const installmentCountSchema = z.coerce.number().int().min(1).max(60);
/** The limit in minor units. Required; legacy cards stored as -1 ("no limit") must be given one when edited. */
const creditLimitSchema = z.coerce.number().int().min(1, "Enter the card credit limit.");
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
  creditLimitAmount: creditLimitSchema,
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
/** How the leftover cents of an even split are placed. See `splitInstallmentAmounts` in `@luraba/domain`. */
export const INSTALLMENT_ROUNDING_MODES = [
  "remainder_last",
  "remainder_first",
  "round_up_all",
] as const;
const installmentRoundingModeSchema = z.enum(INSTALLMENT_ROUNDING_MODES);
/**
 * Card issuers round installments differently, so the invoice amounts can be sent exactly. When `installmentAmounts`
 * (or `installmentAmount` with the count) is given, those amounts are the source of truth: the purchase total is
 * their sum, and a `amount` that disagrees is rejected. Without them the total is split by `roundingMode`.
 */
const installmentPlanFields = {
  amount: moneyAmountSchema.optional(),
  /** Every installment's exact amount; its length is the installment count (1 to 60). */
  installmentAmounts: z.array(moneyAmountSchema).min(1).max(60).optional(),
  /** Every installment costs this much; the count comes from `installmentCount`. */
  installmentAmount: moneyAmountSchema.optional(),
  roundingMode: installmentRoundingModeSchema.optional(),
};
const createCreditCardPurchaseObject = z.object({
  description: z.string().min(1).max(512),
  ...transactionTextFields,
  ...installmentPlanFields,
  categoryId: z.uuid().nullable().optional(),
  merchantId: z.uuid().optional(),
  purchaseDate: dateInputSchema,
  postedDate: dateInputSchema.optional(),
  installmentCount: installmentCountSchema.optional(),
  tagIds: z.array(z.uuid()).max(50).optional(),
  includeInBudget: z.boolean().default(true),
});
export const createCreditCardPurchaseInputSchema = createCreditCardPurchaseObject.refine(
  (value) =>
    value.amount !== undefined ||
    value.installmentAmounts !== undefined ||
    value.installmentAmount !== undefined,
  {
    message: "Send the purchase amount, installmentAmounts or installmentAmount",
    path: ["amount"],
  },
);
export const updateCreditCardPurchaseInputSchema = createCreditCardPurchaseObject
  .partial()
  .extend({
    merchantId: z.uuid().nullable().optional(),
    /** `null` clears it. */
    originalDescription: originalDescriptionSchema.nullable().optional(),
    /** `null` clears it. */
    notes: notesSchema.nullable().optional(),
  })
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    "At least one purchase field must be provided",
  );
export const creditCardInstallmentParamsSchema = z.object({
  id: z.uuid(),
  purchaseId: z.uuid(),
  installmentId: z.uuid(),
});
/** Edits one installment: its amount (the purchase total follows) and/or the invoice it lands on. */
export const updateCreditCardInstallmentInputSchema = z
  .object({
    amount: moneyAmountSchema.optional(),
    billingCycleId: z.uuid().optional(),
  })
  .refine(
    (value) => value.amount !== undefined || value.billingCycleId !== undefined,
    "Send the new amount or the new invoice",
  );
export const CANCEL_PURCHASE_MODES = ["single_credit", "cancel_future"] as const;
/**
 * Cancels a card purchase. `single_credit` credits the whole remaining amount at once, like most
 * issuers. `cancel_future` also removes the installments that are not billed yet and credits
 * only the billed ones.
 */
export const cancelCreditCardPurchaseInputSchema = z.object({
  mode: z.enum(CANCEL_PURCHASE_MODES).default("single_credit"),
  reason: z.enum(["cancellation", "chargeback", "refund"]).default("cancellation"),
  date: dateInputSchema.optional(),
  description: z.string().min(1).max(512).optional(),
  ...transactionTextFields,
});
export const createCreditCardPaymentInputSchema = z.object({
  description: z.string().min(1).max(512).optional(),
  ...transactionTextFields,
  amount: moneyAmountSchema,
  fromAccountId: z.uuid(),
  paymentDate: dateInputSchema,
  postedDate: dateInputSchema.optional(),
});
export const updateCreditCardPaymentInputSchema = createCreditCardPaymentInputSchema
  .partial()
  .extend({
    originalDescription: originalDescriptionSchema.nullable().optional(),
    notes: notesSchema.nullable().optional(),
  })
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
export const creditCardOverviewQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "month must use YYYY-MM format")
    .optional(),
});
export const creditCardInsightsQuerySchema = creditCardOverviewQuerySchema.required();
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
    /** Archived cards are hidden unless this is true. */
    includeArchived: booleanQuerySchema.optional(),
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

export type CreditCardOverviewQuery = z.input<typeof creditCardOverviewQuerySchema>;
export type CreditCardInsightsQuery = z.input<typeof creditCardInsightsQuerySchema>;
export type ListCreditCardsQuery = z.input<typeof listCreditCardsQuerySchema>;
export type ListCreditCardCyclesQuery = z.input<typeof listCreditCardCyclesQuerySchema>;
export type CreditCardForecastQuery = z.input<typeof creditCardForecastQuerySchema>;
export type CreateCreditCardInput = z.input<typeof createCreditCardInputSchema>;
export type UpdateCreditCardInput = z.input<typeof updateCreditCardInputSchema>;
export type UpdateCreditCardCycleInput = z.input<typeof updateCreditCardCycleInputSchema>;
export type CancelCreditCardPurchaseInput = z.input<typeof cancelCreditCardPurchaseInputSchema>;
export type CreateCreditCardPurchaseInput = z.input<typeof createCreditCardPurchaseInputSchema>;
export type UpdateCreditCardInstallmentInput = z.input<
  typeof updateCreditCardInstallmentInputSchema
>;
export type UpdateCreditCardPurchaseInput = z.input<typeof updateCreditCardPurchaseInputSchema>;
export type CreateCreditCardPaymentInput = z.input<typeof createCreditCardPaymentInputSchema>;
export type UpdateCreditCardPaymentInput = z.input<typeof updateCreditCardPaymentInputSchema>;
