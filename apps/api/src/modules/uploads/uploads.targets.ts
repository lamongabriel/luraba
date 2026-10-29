import { ATTACHMENT_TARGETS, type AttachmentTargetType } from "@luraba/contracts/uploads";
import { accountsTable } from "@luraba/db/schemas/accounts.schema";
import { billsTable } from "@luraba/db/schemas/bills.schema";
import { categoriesTable } from "@luraba/db/schemas/categories.schema";
import { creditCardsTable } from "@luraba/db/schemas/credit-cards.schema";
import { householdMembersTable } from "@luraba/db/schemas/households.schema";
import { merchantsTable } from "@luraba/db/schemas/merchants.schema";
import { splitsTable } from "@luraba/db/schemas/splits.schema";
import { transactionsTable } from "@luraba/db/schemas/transactions.schema";
import { usersTable } from "@luraba/db/schemas/users.schema";
import { and, eq, getTableName, sql } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { db } from "@/db";

type HouseholdTargetTable = PgTable & { id: PgColumn; householdId: PgColumn };

/**
 * Where each household-scoped target type lives. This is the one place to touch
 * when a new kind of record can have attachments (next to `ATTACHMENT_TARGETS`).
 */
const HOUSEHOLD_TARGET_TABLES = {
  merchant: merchantsTable,
  account: accountsTable,
  credit_card: creditCardsTable,
  category: categoriesTable,
  transaction: transactionsTable,
  bill: billsTable,
  split: splitsTable,
} as const satisfies Partial<Record<AttachmentTargetType, HouseholdTargetTable>>;

type TableBackedTarget = keyof typeof HOUSEHOLD_TARGET_TABLES;

function isTableBacked(type: AttachmentTargetType): type is TableBackedTarget {
  return type in HOUSEHOLD_TARGET_TABLES;
}

/** Does a household-scoped target exist, and does it belong to this household? */
export async function householdTargetExists(
  type: AttachmentTargetType,
  targetId: string,
  householdId: string,
): Promise<boolean> {
  if (ATTACHMENT_TARGETS[type].scope !== "household") return false;
  if (type === "household") return targetId === householdId;
  if (!isTableBacked(type)) return false;

  const table: HouseholdTargetTable = HOUSEHOLD_TARGET_TABLES[type];
  const [row] = await db
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.id, targetId), eq(table.householdId, householdId)))
    .limit(1);

  return row !== undefined;
}

/** Can `viewerId` see `targetUserId`'s profile picture? Yourself, or someone you share a household with. */
export async function usersShareHousehold(
  viewerId: string,
  targetUserId: string,
): Promise<boolean> {
  if (viewerId === targetUserId) return true;

  const mine = db
    .select({ householdId: householdMembersTable.householdId })
    .from(householdMembersTable)
    .where(eq(householdMembersTable.userId, viewerId));
  const [row] = await db
    .select({ userId: householdMembersTable.userId })
    .from(householdMembersTable)
    .where(
      and(
        eq(householdMembersTable.userId, targetUserId),
        sql`${householdMembersTable.householdId} in (${mine})`,
      ),
    )
    .limit(1);

  return row !== undefined;
}

export async function userExists(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  return row !== undefined;
}

/**
 * Removes attachments whose target record was deleted, so a deleted merchant's
 * logo does not look "in use" forever. Returns how many were removed.
 */
export async function pruneDanglingAttachments(householdId: string): Promise<number> {
  let removed = 0;

  for (const type of Object.keys(HOUSEHOLD_TARGET_TABLES) as TableBackedTarget[]) {
    const table = sql.identifier(getTableName(HOUSEHOLD_TARGET_TABLES[type]));
    const result = await db.execute(sql`
      delete from attachments a
      using uploads u
      where a.upload_id = u.id
        and u.household_id = ${householdId}
        and a.target_type = ${type}
        and not exists (select 1 from ${table} t where t.id = a.target_id)
    `);
    removed += result.rowCount ?? 0;
  }

  return removed;
}
