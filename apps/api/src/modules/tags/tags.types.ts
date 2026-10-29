import type { tagsTable } from "@luraba/db/schemas/tags.schema";

export type TagRecord = typeof tagsTable.$inferSelect;
