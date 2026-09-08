import { pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { householdsTable } from "./households.schema";

export const tagsTable = pgTable(
  "tags",
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => householdsTable.id, { onDelete: "cascade" }),
    name: varchar({ length: 64 }).notNull(),
    color: varchar({ length: 7 }),
    icon: varchar({ length: 128 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("tags_household_name_unique").on(table.householdId, table.name)],
);
