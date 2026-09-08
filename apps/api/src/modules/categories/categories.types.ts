import type { categoriesTable } from "@/db/schemas/categories.schema";

export type CategoryRecord = typeof categoriesTable.$inferSelect;
