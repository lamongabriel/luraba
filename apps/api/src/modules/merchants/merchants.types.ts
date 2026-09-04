import type { merchantsTable } from '@/db/schemas/merchants.schema';

export type MerchantRecord = typeof merchantsTable.$inferSelect;
