import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { categoriesTable } from '@/db/schemas/categories.schema';
import { usersTable } from '@/db/schemas/users.schema';
import { Category } from './categories.types';

export async function findUserById(userId: string): Promise<{ id: string } | undefined> {
  const rows = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, userId));
  return rows[0];
}

export async function findByUserAndName(userId: string, name: string): Promise<Category | undefined> {
  const rows = await db
    .select()
    .from(categoriesTable)
    .where(and(eq(categoriesTable.userId, userId), eq(categoriesTable.name, name)));

  return rows[0];
}

export async function findOwnedCategory(
  categoryId: string,
  userId: string,
): Promise<Category | undefined> {
  const rows = await db
    .select()
    .from(categoriesTable)
    .where(and(eq(categoriesTable.id, categoryId), eq(categoriesTable.userId, userId)));

  return rows[0];
}

export async function createCategory(dto: {
  userId: string;
  name: string;
  parentId?: string;
  type: 'expense' | 'income';
}): Promise<Category> {
  const rows = await db.insert(categoriesTable).values(dto).returning();
  return rows[0];
}

export async function listByUserId(userId: string): Promise<Category[]> {
  return db.select().from(categoriesTable).where(eq(categoriesTable.userId, userId)).orderBy(asc(categoriesTable.name));
}
