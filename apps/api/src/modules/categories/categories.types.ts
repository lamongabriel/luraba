import type { categoriesTable } from "@luraba/db/schemas/categories.schema";

export type CategoryRecord = typeof categoriesTable.$inferSelect;
