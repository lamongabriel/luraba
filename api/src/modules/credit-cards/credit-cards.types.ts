import { z } from 'zod';
import { creditCardCycleStatusSchema } from '@/shared/validation/credit-cards';
import { institutionDomainInputSchema } from '@/shared/validation/domain';
import { moneyAmountSchema } from '@/shared/validation/money';
import { currencySchema } from '@/shared/validation/preferences';
import { creditCardCycleDisplayStatusSchema } from './credit-card-cycles.types';

export { creditCardCycleStatusSchema };

export const dayOfMonthSchema = z.number().int().min(1).max(31);
export const installmentCountSchema = z.coerce.number().int().min(1).max(60);
export const creditLimitAmountSchema = z.coerce.number().int().min(-1);

const creditCardBaseCycleSchema = z.object({
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

const creditCardCycleSchema = creditCardBaseCycleSchema.extend({
  displayStatus: creditCardCycleDisplayStatusSchema,
  isCurrent: z.boolean(),
  isNext: z.boolean(),
  hasActivity: z.boolean(),
});

const creditCardCycleItemSchema = z.object({
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
  accountId: z.uuid(),
  name: z.string(),
  institutionName: z.string().nullable(),
  institutionDomain: z.string().nullable(),
  institutionLogoUrl: z.string().nullable(),
  notes: z.string().nullable(),
  classification: z.literal('liability'),
  type: z.literal('credit_card'),
  currencyCode: currencySchema,
  brand: z.string(),
  productType: z.literal('credit'),
  last4: z.string(),
  color: z.string().nullable(),
  closingDay: z.number().int(),
  dueDay: z.number().int(),
  creditLimitAmount: z.number().int(),
  remainingCreditAmount: z.number().int().nullable(),
  balance: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const creditCardCycleDetailSchema = z.object({
  cycle: creditCardCycleSchema,
  items: z.array(creditCardCycleItemSchema),
});

export const creditCardPurchaseSchema = z.object({
  purchaseId: z.uuid(),
  creditCardId: z.uuid(),
  transactionId: z.uuid(),
  description: z.string(),
  categoryId: z.uuid(),
  merchantId: z.uuid().nullable(),
  purchaseDate: z.iso.date(),
  postedDate: z.iso.date(),
  amount: z.number().int(),
  installmentCount: z.number().int(),
  budgetExpenseTiming: z.enum(['spend_month', 'payment_month']),
  budgetInstallmentMode: z.enum(['per_installment', 'full_amount']),
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
  createdAt: z.date(),
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
  allocations: z.array(
    z.object({
      billingCycleId: z.uuid(),
      amount: z.number().int(),
    }),
  ),
  createdAt: z.date(),
});

export const creditCardForecastSchema = z.object({
  creditCardId: z.uuid(),
  fromMonth: z.string().regex(/^\d{4}-\d{2}$/),
  months: z.number().int(),
  cycles: z.array(
    creditCardCycleSchema.extend({
      items: z.array(creditCardCycleItemSchema),
    }),
  ),
});

export const ListCreditCardsResponseSchema = z.array(creditCardSchema);

export const CreateCreditCardRequestBodySchema = z.object({
  name: z.string().min(1).max(255),
  institutionName: z.string().min(1).max(255).optional(),
  institutionDomain: institutionDomainInputSchema.optional(),
  notes: z.string().max(4000).optional(),
  currencyCode: currencySchema,
  brand: z.string().min(1).max(64),
  productType: z.literal('credit').optional(),
  last4: z.string().regex(/^\d{4}$/, 'Last 4 digits must be exactly 4 numeric characters'),
  color: z.string().min(1).max(32).optional(),
  closingDay: dayOfMonthSchema,
  dueDay: dayOfMonthSchema,
  creditLimitAmount: creditLimitAmountSchema.optional(),
});

export const CreateCreditCardResponseSchema = creditCardSchema;

export const GetCreditCardRequestParamsSchema = z.object({
  id: z.uuid(),
});

export const GetCreditCardResponseSchema = creditCardSchema;

export const UpdateCreditCardRequestParamsSchema = z.object({
  id: z.uuid(),
});

export const UpdateCreditCardRequestBodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  institutionName: z.string().min(1).max(255).nullable().optional(),
  institutionDomain: institutionDomainInputSchema.nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  brand: z.string().min(1).max(64).optional(),
  productType: z.literal('credit').optional(),
  last4: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
  color: z.string().min(1).max(32).nullable().optional(),
  closingDay: dayOfMonthSchema.optional(),
  dueDay: dayOfMonthSchema.optional(),
  creditLimitAmount: creditLimitAmountSchema.optional(),
});

export const UpdateCreditCardResponseSchema = creditCardSchema;

export const DeleteCreditCardRequestParamsSchema = z.object({
  id: z.uuid(),
});

export const ListCreditCardCyclesRequestParamsSchema = z.object({
  id: z.uuid(),
});

export const ListCreditCardCyclesResponseSchema = z.array(creditCardCycleSchema);

export const GetCreditCardCycleRequestParamsSchema = z.object({
  id: z.uuid(),
  cycleId: z.uuid(),
});

export const GetCreditCardCycleResponseSchema = creditCardCycleDetailSchema;

export const UpdateCreditCardCycleRequestParamsSchema = z.object({
  id: z.uuid(),
  cycleId: z.uuid(),
});

export const UpdateCreditCardCycleRequestBodySchema = z
  .object({
    closingDate: z.coerce.date().optional(),
    dueDate: z.coerce.date().optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'At least one cycle date must be provided',
  })
  .superRefine((value, ctx) => {
    if (value.closingDate && value.dueDate && value.closingDate > value.dueDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['dueDate'],
        message: 'dueDate must be on or after closingDate',
      });
    }
  });

export const UpdateCreditCardCycleResponseSchema = creditCardCycleDetailSchema;

export const CreateCreditCardPurchaseRequestParamsSchema = z.object({
  id: z.uuid(),
});

export const CreateCreditCardPurchaseRequestBodySchema = z.object({
  description: z.string().min(1).max(512),
  amount: moneyAmountSchema,
  categoryId: z.uuid(),
  merchantId: z.uuid().optional(),
  purchaseDate: z.coerce.date(),
  postedDate: z.coerce.date().optional(),
  installmentCount: installmentCountSchema.default(1),
});

export const CreateCreditCardPurchaseResponseSchema = creditCardPurchaseSchema;

export const GetCreditCardPurchaseRequestParamsSchema = z.object({
  id: z.uuid(),
  purchaseId: z.uuid(),
});

export const GetCreditCardPurchaseResponseSchema = creditCardPurchaseSchema;

export const UpdateCreditCardPurchaseRequestParamsSchema = z.object({
  id: z.uuid(),
  purchaseId: z.uuid(),
});

export const UpdateCreditCardPurchaseRequestBodySchema = z
  .object({
    description: z.string().min(1).max(512).optional(),
    amount: moneyAmountSchema.optional(),
    categoryId: z.uuid().optional(),
    merchantId: z.uuid().nullable().optional(),
    purchaseDate: z.coerce.date().optional(),
    postedDate: z.coerce.date().optional(),
    installmentCount: installmentCountSchema.optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'At least one purchase field must be provided',
  });

export const UpdateCreditCardPurchaseResponseSchema = creditCardPurchaseSchema;

export const DeleteCreditCardPurchaseRequestParamsSchema = z.object({
  id: z.uuid(),
  purchaseId: z.uuid(),
});

export const CreateCreditCardPaymentRequestParamsSchema = z.object({
  id: z.uuid(),
});

export const CreateCreditCardPaymentRequestBodySchema = z.object({
  description: z.string().min(1).max(512).optional(),
  amount: moneyAmountSchema,
  fromAccountId: z.uuid(),
  paymentDate: z.coerce.date(),
  postedDate: z.coerce.date().optional(),
});

export const CreateCreditCardPaymentResponseSchema = creditCardPaymentSchema;

export const GetCreditCardPaymentRequestParamsSchema = z.object({
  id: z.uuid(),
  paymentId: z.uuid(),
});

export const GetCreditCardPaymentResponseSchema = creditCardPaymentSchema;

export const UpdateCreditCardPaymentRequestParamsSchema = z.object({
  id: z.uuid(),
  paymentId: z.uuid(),
});

export const UpdateCreditCardPaymentRequestBodySchema = z
  .object({
    description: z.string().min(1).max(512).optional(),
    amount: moneyAmountSchema.optional(),
    fromAccountId: z.uuid().optional(),
    paymentDate: z.coerce.date().optional(),
    postedDate: z.coerce.date().optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'At least one payment field must be provided',
  });

export const UpdateCreditCardPaymentResponseSchema = creditCardPaymentSchema;

export const DeleteCreditCardPaymentRequestParamsSchema = z.object({
  id: z.uuid(),
  paymentId: z.uuid(),
});

export const GetCreditCardForecastRequestParamsSchema = z.object({
  id: z.uuid(),
});

export const GetCreditCardForecastRequestQuerySchema = z.object({
  fromMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'fromMonth must use YYYY-MM format')
    .optional(),
  months: z.coerce.number().int().min(1).max(24).default(12),
});

export const GetCreditCardForecastResponseSchema = creditCardForecastSchema;

export type CreditCardResponse = z.infer<typeof creditCardSchema>;
export type BaseCreditCardCycleSummary = z.infer<typeof creditCardBaseCycleSchema>;
export type CreditCardCycleSummary = z.infer<typeof creditCardCycleSchema>;
export type CreditCardCycleItem = z.infer<typeof creditCardCycleItemSchema>;
export type CreditCardCycleDetailResponse = z.infer<typeof creditCardCycleDetailSchema>;
export type CreditCardPurchaseResponse = z.infer<typeof creditCardPurchaseSchema>;
export type CreditCardPaymentResponse = z.infer<typeof creditCardPaymentSchema>;
export type CreditCardForecastResponse = z.infer<typeof creditCardForecastSchema>;

export type ListCreditCardsResponse = z.infer<typeof ListCreditCardsResponseSchema>;
export type CreateCreditCardRequestBody = z.infer<typeof CreateCreditCardRequestBodySchema>;
export type CreateCreditCardResponse = z.infer<typeof CreateCreditCardResponseSchema>;
export type GetCreditCardRequestParams = z.infer<typeof GetCreditCardRequestParamsSchema>;
export type GetCreditCardResponse = z.infer<typeof GetCreditCardResponseSchema>;
export type UpdateCreditCardRequestParams = z.infer<typeof UpdateCreditCardRequestParamsSchema>;
export type UpdateCreditCardRequestBody = z.infer<typeof UpdateCreditCardRequestBodySchema>;
export type UpdateCreditCardResponse = z.infer<typeof UpdateCreditCardResponseSchema>;
export type DeleteCreditCardRequestParams = z.infer<typeof DeleteCreditCardRequestParamsSchema>;
export type ListCreditCardCyclesRequestParams = z.infer<
  typeof ListCreditCardCyclesRequestParamsSchema
>;
export type ListCreditCardCyclesResponse = z.infer<typeof ListCreditCardCyclesResponseSchema>;
export type GetCreditCardCycleRequestParams = z.infer<typeof GetCreditCardCycleRequestParamsSchema>;
export type GetCreditCardCycleResponse = z.infer<typeof GetCreditCardCycleResponseSchema>;
export type UpdateCreditCardCycleRequestParams = z.infer<
  typeof UpdateCreditCardCycleRequestParamsSchema
>;
export type UpdateCreditCardCycleRequestBody = z.infer<
  typeof UpdateCreditCardCycleRequestBodySchema
>;
export type UpdateCreditCardCycleResponse = z.infer<typeof UpdateCreditCardCycleResponseSchema>;
export type CreateCreditCardPurchaseRequestParams = z.infer<
  typeof CreateCreditCardPurchaseRequestParamsSchema
>;
export type CreateCreditCardPurchaseRequestBody = z.infer<
  typeof CreateCreditCardPurchaseRequestBodySchema
>;
export type CreateCreditCardPurchaseResponse = z.infer<
  typeof CreateCreditCardPurchaseResponseSchema
>;
export type GetCreditCardPurchaseRequestParams = z.infer<
  typeof GetCreditCardPurchaseRequestParamsSchema
>;
export type GetCreditCardPurchaseResponse = z.infer<typeof GetCreditCardPurchaseResponseSchema>;
export type UpdateCreditCardPurchaseRequestParams = z.infer<
  typeof UpdateCreditCardPurchaseRequestParamsSchema
>;
export type UpdateCreditCardPurchaseRequestBody = z.infer<
  typeof UpdateCreditCardPurchaseRequestBodySchema
>;
export type UpdateCreditCardPurchaseResponse = z.infer<
  typeof UpdateCreditCardPurchaseResponseSchema
>;
export type DeleteCreditCardPurchaseRequestParams = z.infer<
  typeof DeleteCreditCardPurchaseRequestParamsSchema
>;
export type CreateCreditCardPaymentRequestParams = z.infer<
  typeof CreateCreditCardPaymentRequestParamsSchema
>;
export type CreateCreditCardPaymentRequestBody = z.infer<
  typeof CreateCreditCardPaymentRequestBodySchema
>;
export type CreateCreditCardPaymentResponse = z.infer<typeof CreateCreditCardPaymentResponseSchema>;
export type GetCreditCardPaymentRequestParams = z.infer<
  typeof GetCreditCardPaymentRequestParamsSchema
>;
export type GetCreditCardPaymentResponse = z.infer<typeof GetCreditCardPaymentResponseSchema>;
export type UpdateCreditCardPaymentRequestParams = z.infer<
  typeof UpdateCreditCardPaymentRequestParamsSchema
>;
export type UpdateCreditCardPaymentRequestBody = z.infer<
  typeof UpdateCreditCardPaymentRequestBodySchema
>;
export type UpdateCreditCardPaymentResponse = z.infer<typeof UpdateCreditCardPaymentResponseSchema>;
export type DeleteCreditCardPaymentRequestParams = z.infer<
  typeof DeleteCreditCardPaymentRequestParamsSchema
>;
export type GetCreditCardForecastRequestParams = z.infer<
  typeof GetCreditCardForecastRequestParamsSchema
>;
export type GetCreditCardForecastRequestQuery = z.infer<
  typeof GetCreditCardForecastRequestQuerySchema
>;
export type GetCreditCardForecastResponse = z.infer<typeof GetCreditCardForecastResponseSchema>;

export type CreateCreditCardDto = CreateCreditCardRequestBody;
export type UpdateCreditCardDto = UpdateCreditCardRequestBody;
export type UpdateCreditCardCycleDto = UpdateCreditCardCycleRequestBody;
export type CreateCreditCardPurchaseDto = CreateCreditCardPurchaseRequestBody;
export type UpdateCreditCardPurchaseDto = UpdateCreditCardPurchaseRequestBody;
export type CreateCreditCardPaymentDto = CreateCreditCardPaymentRequestBody;
export type UpdateCreditCardPaymentDto = UpdateCreditCardPaymentRequestBody;
export type CreditCardForecastQuery = GetCreditCardForecastRequestQuery;
