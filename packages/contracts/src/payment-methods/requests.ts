import { z } from "zod";
import { currencyCodeSchema, hexColorSchema, iconNameSchema, idParamsSchema } from "../common.js";
import {
  booleanQuerySchema,
  commaSeparatedArraySchema,
  createListQuerySchema,
  temporalQuerySchema,
  validateRange,
} from "../list.js";
import { paymentMethodScopeSchema } from "./resource.js";
export const createPaymentMethodBodySchema = z.object({
  name: z.string().trim().min(1).max(64),
  code: z.string().trim().min(1).max(32).optional(),
  currencyCode: currencyCodeSchema.optional(),
  color: hexColorSchema.optional(),
  icon: iconNameSchema.optional(),
});
export const updatePaymentMethodBodySchema = z
  .object({
    name: z.string().trim().min(1).max(64).optional(),
    code: z.string().trim().min(1).max(32).optional(),
    currencyCode: currencyCodeSchema.nullable().optional(),
    color: hexColorSchema.nullable().optional(),
    icon: iconNameSchema.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");
export const listPaymentMethodsQuerySchema = createListQuerySchema(
  {
    codes: commaSeparatedArraySchema(z.string().trim().min(1).max(32)),
    scopes: commaSeparatedArraySchema(paymentMethodScopeSchema),
    currencyCode: currencyCodeSchema.optional(),
    hasCurrency: booleanQuerySchema.optional(),
    createdAtFrom: temporalQuerySchema.optional(),
    createdAtTo: temporalQuerySchema.optional(),
    updatedAtFrom: temporalQuerySchema.optional(),
    updatedAtTo: temporalQuerySchema.optional(),
  },
  ["name", "code", "scope", "currencyCode", "createdAt", "updatedAt"],
).superRefine((query, ctx) => {
  validateRange(query, ctx, "createdAtFrom", "createdAtTo");
  validateRange(query, ctx, "updatedAtFrom", "updatedAtTo");
});
export { idParamsSchema };
export type ListPaymentMethodsQuery = z.input<typeof listPaymentMethodsQuerySchema>;
export type CreatePaymentMethodInput = z.input<typeof createPaymentMethodBodySchema>;
export type UpdatePaymentMethodInput = z.input<typeof updatePaymentMethodBodySchema>;
