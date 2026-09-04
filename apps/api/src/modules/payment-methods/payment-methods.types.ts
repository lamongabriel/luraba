import type { paymentMethodsTable } from '@/db/schemas/payment-methods.schema';

export type PaymentMethodRecord = typeof paymentMethodsTable.$inferSelect;
