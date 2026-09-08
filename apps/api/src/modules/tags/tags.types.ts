import type { tagsTable } from "@/db/schemas/tags.schema";

export type TagRecord = typeof tagsTable.$inferSelect;
