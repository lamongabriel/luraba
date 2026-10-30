import type { productsTable } from "@luraba/db/schemas/products.schema";

export type ProductRecord = typeof productsTable.$inferSelect;
