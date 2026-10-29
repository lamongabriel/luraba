import type { usersTable } from "@luraba/db/schemas/users.schema";

export type UserRecord = typeof usersTable.$inferSelect;
