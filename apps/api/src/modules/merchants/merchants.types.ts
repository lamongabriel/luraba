import type { merchantsTable } from "@luraba/db/schemas/merchants.schema";

export type MerchantRecord = typeof merchantsTable.$inferSelect;
