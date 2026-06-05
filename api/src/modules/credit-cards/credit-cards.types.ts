import { z } from 'zod';
import { isSameDay } from '@/shared/lib/date';
import {
  creditCardCycleStatusSchema,
  creditCardProductTypeSchema,
} from '@/shared/validation/credit-cards';
import { moneyAmountSchema } from '@/shared/validation/money';

export { creditCardCycleStatusSchema, creditCardProductTypeSchema };

export const currencyCodeSchema = z
  .string()
  .trim()
  .length(3)
  .transform((value) => value.toUpperCase());
export const dayOfMonthSchema = z.number().int().min(1).max(31);
export const installmentCountSchema = z.coerce.number().int().min(1).max(60);

export const creditCardIdParamSchema = z.object({
  id: z.uuid(),
});

export const creditCardCycleIdParamSchema = z.object({
  id: z.uuid(),
  cycleId: z.uuid(),
});

export const updateCreditCardCycleSchema = z
  .object({
    periodStart: z.coerce.date().optional(),
    periodEnd: z.coerce.date().optional(),
    closingDate: z.coerce.date().optional(),
    dueDate: z.coerce.date().optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'At least one cycle date must be provided',
  })
  .superRefine((value, ctx) => {
    const effectivePeriodEnd = value.periodEnd ?? value.closingDate;
    const effectiveClosingDate = value.closingDate ?? value.periodEnd;

    if (value.periodStart && effectivePeriodEnd && value.periodStart > effectivePeriodEnd) {
      ctx.addIssue({
        code: 'custom',
        path: ['periodStart'],
        message: 'periodStart must be on or before periodEnd',
      });
    }

    if (value.periodEnd && value.closingDate && !isSameDay(value.periodEnd, value.closingDate)) {
      ctx.addIssue({
        code: 'custom',
        path: ['periodEnd'],
        message: 'periodEnd and closingDate must be the same date when both are provided',
      });
    }

    if (effectiveClosingDate && value.dueDate && effectiveClosingDate > value.dueDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['dueDate'],
        message: 'dueDate must be on or after closingDate',
      });
    }
  });

export const createCreditCardSchema = z.object({
  name: z.string().min(1).max(255),
  institutionName: z.string().min(1).max(255).optional(),
  institutionDomain: z.string().min(1).max(255).optional(),
  notes: z.string().max(4000).optional(),
  currencyCode: currencyCodeSchema,
  brand: z.string().min(1).max(64),
  productType: creditCardProductTypeSchema.default('credit'),
  last4: z.string().regex(/^\d{4}$/, 'Last 4 digits must be exactly 4 numeric characters'),
  color: z.string().min(1).max(32).optional(),
  closingDay: dayOfMonthSchema,
  dueDay: dayOfMonthSchema,
});

export const updateCreditCardSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  institutionName: z.string().min(1).max(255).nullable().optional(),
  institutionDomain: z.string().min(1).max(255).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  brand: z.string().min(1).max(64).optional(),
  productType: creditCardProductTypeSchema.optional(),
  last4: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
  color: z.string().min(1).max(32).nullable().optional(),
  closingDay: dayOfMonthSchema.optional(),
  dueDay: dayOfMonthSchema.optional(),
});

export const createCreditCardPurchaseSchema = z.object({
  description: z.string().min(1).max(512),
  amount: moneyAmountSchema,
  categoryId: z.uuid(),
  merchantId: z.uuid().optional(),
  purchaseDate: z.coerce.date(),
  postedDate: z.coerce.date().optional(),
  installmentCount: installmentCountSchema.default(1),
});

export const createCreditCardPaymentSchema = z.object({
  description: z.string().min(1).max(512).optional(),
  amount: moneyAmountSchema,
  fromAccountId: z.uuid(),
  paymentDate: z.coerce.date(),
  postedDate: z.coerce.date().optional(),
});

export const creditCardForecastQuerySchema = z.object({
  fromMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'fromMonth must use YYYY-MM format')
    .optional(),
  months: z.coerce.number().int().min(1).max(24).default(12),
});

export type CreateCreditCardDto = z.infer<typeof createCreditCardSchema>;
export type UpdateCreditCardDto = z.infer<typeof updateCreditCardSchema>;
export type UpdateCreditCardCycleDto = z.infer<typeof updateCreditCardCycleSchema>;
export type CreateCreditCardPurchaseDto = z.infer<typeof createCreditCardPurchaseSchema>;
export type CreateCreditCardPaymentDto = z.infer<typeof createCreditCardPaymentSchema>;
export type CreditCardForecastQuery = z.infer<typeof creditCardForecastQuerySchema>;

export type CreditCardResponse = {
  id: string;
  accountId: string;
  name: string;
  institutionName: string | null;
  institutionDomain: string | null;
  notes: string | null;
  classification: 'liability';
  type: 'credit_card';
  currencyCode: string;
  brand: string;
  productType: 'credit';
  last4: string;
  color: string | null;
  closingDay: number;
  dueDay: number;
  unappliedCreditAmount: number;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CreditCardCycleSummary = {
  id: string;
  creditCardId: string;
  periodStart: string;
  periodEnd: string;
  closingDate: string;
  dueDate: string;
  status: z.infer<typeof creditCardCycleStatusSchema>;
  statementAmount: number;
  paidAmount: number;
  remainingAmount: number;
};

export type CreditCardCycleItem = {
  installmentId: string;
  purchaseId: string;
  transactionId: string;
  description: string;
  categoryId: string | null;
  merchantId: string | null;
  installmentNumber: number;
  installmentCount: number;
  amount: number;
  purchaseDate: string;
  postedDate: string;
};

export type CreditCardCycleDetailResponse = {
  cycle: CreditCardCycleSummary;
  items: CreditCardCycleItem[];
};

export type CreditCardPurchaseResponse = {
  purchaseId: string;
  creditCardId: string;
  transactionId: string;
  amount: number;
  installmentCount: number;
  budgetExpenseTiming: 'spend_month' | 'payment_month';
  budgetInstallmentMode: 'per_installment' | 'full_amount';
  installments: Array<{
    installmentId: string;
    installmentNumber: number;
    amount: number;
    billingCycleId: string;
    closingDate: string;
    dueDate: string;
  }>;
  createdAt: Date;
};

export type CreditCardPaymentResponse = {
  paymentId: string;
  creditCardId: string;
  transactionId: string;
  amount: number;
  fromAccountId: string;
  allocations: Array<{
    billingCycleId: string | null;
    amount: number;
  }>;
  unappliedCreditAmount: number;
  createdAt: Date;
};

export type CreditCardForecastResponse = {
  creditCardId: string;
  fromMonth: string;
  months: number;
  unappliedCreditAmount: number;
  cycles: Array<CreditCardCycleSummary & { items: CreditCardCycleItem[] }>;
};
