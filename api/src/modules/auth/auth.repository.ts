import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { usersTable } from '@/db/schemas/users.schema';

export async function findUserByEmail(email: string): Promise<typeof usersTable.$inferSelect | undefined> {
  const rows = await db.select().from(usersTable).where(eq(usersTable.email, email));
  return rows[0];
}

export async function findUserById(id: string): Promise<typeof usersTable.$inferSelect | undefined> {
  const rows = await db.select().from(usersTable).where(eq(usersTable.id, id));
  return rows[0];
}

export async function createUser(values: {
  name: string;
  email: string;
  passwordHash: string;
}): Promise<typeof usersTable.$inferSelect> {
  const rows = await db.insert(usersTable).values(values).returning();
  return rows[0];
}
