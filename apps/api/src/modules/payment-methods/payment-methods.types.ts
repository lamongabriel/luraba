import type { paymentMethodsTable } from "@luraba/db/schemas/payment-methods.schema";

export type PaymentMethodRecord = typeof paymentMethodsTable.$inferSelect;
