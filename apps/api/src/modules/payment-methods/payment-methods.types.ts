import { z } from 'zod';
import type { paymentMethodsTable } from '@/db/schemas/payment-methods.schema';
import { hexColorSchema, iconNameSchema } from '@/shared/validation/categories';
import { currencySchema } from '@/shared/validation/preferences';
import { paymentMethodScopeSchema } from './payment-methods.query';

export type PaymentMethodRecord = typeof paymentMethodsTable.$inferSelect;

export const paymentMethodSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  scope: paymentMethodScopeSchema,
  currencyCode: currencySchema.nullable(),
  translationKey: z.string().nullable(),
  color: hexColorSchema.nullable(),
  icon: iconNameSchema.nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const ListPaymentMethodsResponseSchema = z.array(paymentMethodSchema);

export const CreatePaymentMethodRequestBodySchema = z.object({
  name: z.string().trim().min(1).max(64),
  code: z.string().trim().min(1).max(32).optional(),
  currencyCode: currencySchema.optional(),
  color: hexColorSchema.optional(),
  icon: iconNameSchema.optional(),
});

export const CreatePaymentMethodResponseSchema = paymentMethodSchema;

export const UpdatePaymentMethodRequestParamsSchema = z.object({
  id: z.uuid(),
});

export const UpdatePaymentMethodRequestBodySchema = z
  .object({
    name: z.string().trim().min(1).max(64).optional(),
    code: z.string().trim().min(1).max(32).optional(),
    currencyCode: currencySchema.nullable().optional(),
    color: hexColorSchema.nullable().optional(),
    icon: iconNameSchema.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be provided');

export const UpdatePaymentMethodResponseSchema = paymentMethodSchema;

export const DeletePaymentMethodRequestParamsSchema = z.object({
  id: z.uuid(),
});

export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export type ListPaymentMethodsResponse = z.infer<typeof ListPaymentMethodsResponseSchema>;
export type CreatePaymentMethodRequestBody = z.infer<typeof CreatePaymentMethodRequestBodySchema>;
export type CreatePaymentMethodResponse = z.infer<typeof CreatePaymentMethodResponseSchema>;
export type UpdatePaymentMethodRequestParams = z.infer<
  typeof UpdatePaymentMethodRequestParamsSchema
>;
export type UpdatePaymentMethodRequestBody = z.infer<typeof UpdatePaymentMethodRequestBodySchema>;
export type UpdatePaymentMethodResponse = z.infer<typeof UpdatePaymentMethodResponseSchema>;
export type DeletePaymentMethodRequestParams = z.infer<
  typeof DeletePaymentMethodRequestParamsSchema
>;
