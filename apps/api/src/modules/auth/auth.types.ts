import type { usersTable } from '@/db/schemas/users.schema';

export type UserRecord = typeof usersTable.$inferSelect;
