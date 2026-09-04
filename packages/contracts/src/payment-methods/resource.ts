import { z } from "zod";
import { currencyCodeSchema, hexColorSchema, iconNameSchema } from "../common.js";

export const paymentMethodScopeSchema = z.enum(["system", "household"]);
export const paymentMethodSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  scope: paymentMethodScopeSchema,
  currencyCode: currencyCodeSchema.nullable(),
  translationKey: z.string().nullable(),
  color: hexColorSchema.nullable(),
  icon: iconNameSchema.nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type PaymentMethod = z.output<typeof paymentMethodSchema>;
export type PaymentMethodScope = z.output<typeof paymentMethodScopeSchema>;
