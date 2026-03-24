import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { merchantsTable } from '@/db/schemas/merchants.schema';
import { usersTable } from '@/db/schemas/users.schema';
import { Merchant } from './merchants.types';

export async function findUserById(userId: number): Promise<{ id: number } | undefined> {
  const rows = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, userId));
  return rows[0];
}

export async function findByUserAndName(userId: number, name: string): Promise<Merchant | undefined> {
  const rows = await db
    .select()
    .from(merchantsTable)
    .where(and(eq(merchantsTable.userId, userId), eq(merchantsTable.name, name)));

  return rows[0];
}

export async function createMerchant(dto: {
  userId: number;
  name: string;
  website?: string;
  logoUrl?: string;
}): Promise<Merchant> {
  const rows = await db.insert(merchantsTable).values(dto).returning();
  return rows[0];
}

export async function listByUserId(userId: number): Promise<Merchant[]> {
  return db.select().from(merchantsTable).where(eq(merchantsTable.userId, userId));
}

export async function findOwnedMerchant(
  merchantId: number,
  userId: number,
): Promise<Merchant | undefined> {
  const rows = await db
    .select()
    .from(merchantsTable)
    .where(and(eq(merchantsTable.id, merchantId), eq(merchantsTable.userId, userId)));

  return rows[0];
}