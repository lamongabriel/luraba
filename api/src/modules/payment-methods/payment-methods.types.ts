import { z } from 'zod';
import { paymentMethodsTable } from '@/db/schemas/payment-methods.schema';

export type PaymentMethodRecord = typeof paymentMethodsTable.$inferSelect;

export const currencyCodeSchema = z.string().trim().length(3).transform((value) => value.toUpperCase());

export const listPaymentMethodsQuerySchema = z.object({
  currencyCode: currencyCodeSchema.optional(),
});

export type ListPaymentMethodsQuery = z.infer<typeof listPaymentMethodsQuerySchema>;

export type PaymentMethodResponse = {
  id: string;
  code: string;
  name: string;
  currencyCode: string | null;
};

export function mapPaymentMethodRecord(method: PaymentMethodRecord): PaymentMethodResponse {
  return {
    id: method.id,
    code: method.code,
    name: method.name,
    currencyCode: method.currencyId ?? null,
  };
}
