import type { UploadKind } from "@luraba/contracts/uploads";
import { householdMembersTable } from "@luraba/db/schemas/households.schema";
import { attachmentsTable, uploadsTable } from "@luraba/db/schemas/uploads.schema";
import { and, asc, count, desc, eq, inArray, lt, max, sql } from "drizzle-orm";
import { db } from "@/db";
import { buildIlikeSearch, type DbListPage, getPagination } from "@/shared/list";
import type { AttachmentRecord, AttachmentWithUpload, UploadRecord } from "./uploads.types";

export type NewUpload = Omit<typeof uploadsTable.$inferInsert, "id" | "createdAt"> & { id: string };
type Executor = Pick<typeof db, "select" | "insert" | "update" | "delete">;

// Drizzle renders a column of the outer table unqualified inside a subquery, where it would
// resolve to the attachments table instead, so the outer id is written out qualified.
const outerUploadId = sql.raw(`"uploads"."id"`);
const attachmentCountSql = sql<number>`(
  select count(*)::int from ${attachmentsTable} where ${attachmentsTable.uploadId} = ${outerUploadId}
)`;
const uploadSelection = {
  id: uploadsTable.id,
  scope: uploadsTable.scope,
  householdId: uploadsTable.householdId,
  uploadedByUserId: uploadsTable.uploadedByUserId,
  storageKey: uploadsTable.storageKey,
  filename: uploadsTable.filename,
  contentType: uploadsTable.contentType,
  kind: uploadsTable.kind,
  sizeBytes: uploadsTable.sizeBytes,
  sha256: uploadsTable.sha256,
  createdAt: uploadsTable.createdAt,
  attachmentCount: attachmentCountSql,
};

/** Uploads visible in one library: a person's own, or a household's. */
export type LibraryOwner =
  | { scope: "user"; userId: string }
  | { scope: "household"; householdId: string };

function ownerFilter(owner: LibraryOwner) {
  return owner.scope === "user"
    ? and(eq(uploadsTable.scope, "user"), eq(uploadsTable.uploadedByUserId, owner.userId))
    : and(eq(uploadsTable.scope, "household"), eq(uploadsTable.householdId, owner.householdId));
}

const unattachedFilter = sql`not exists (
  select 1 from ${attachmentsTable} where ${attachmentsTable.uploadId} = ${outerUploadId}
)`;

// ─── Uploads ─────────────────────────────────────────────────────────────

export async function insertUpload(values: NewUpload): Promise<UploadRecord> {
  await db.insert(uploadsTable).values(values);
  const upload = await getUpload(values.id);
  if (!upload) throw new Error("Failed to create upload");
  return upload;
}

export async function getUpload(id: string): Promise<UploadRecord | undefined> {
  const [row] = await db.select(uploadSelection).from(uploadsTable).where(eq(uploadsTable.id, id));
  return row;
}

export async function listUploadsPage(
  owner: LibraryOwner,
  query: {
    page: number;
    perPage: number;
    search?: string;
    kind?: UploadKind;
    unattached?: boolean;
    sort?: string;
    sortDirection: "asc" | "desc";
  },
): Promise<DbListPage<UploadRecord>> {
  const where = and(
    ownerFilter(owner),
    query.kind ? eq(uploadsTable.kind, query.kind) : undefined,
    query.unattached ? unattachedFilter : undefined,
    buildIlikeSearch(query.search, [sql`${uploadsTable.filename}`]),
  );
  const sortColumns = {
    createdAt: uploadsTable.createdAt,
    sizeBytes: uploadsTable.sizeBytes,
    filename: uploadsTable.filename,
  } as const;
  const sortColumn = sortColumns[query.sort as keyof typeof sortColumns] ?? uploadsTable.createdAt;
  const direction = query.sort ? query.sortDirection : "desc";
  const { limit, offset } = getPagination(query);

  const [countRow, rows] = await Promise.all([
    db.select({ value: count() }).from(uploadsTable).where(where),
    db
      .select(uploadSelection)
      .from(uploadsTable)
      .where(where)
      .orderBy(direction === "desc" ? desc(sortColumn) : asc(sortColumn), asc(uploadsTable.id))
      .limit(limit)
      .offset(offset),
  ]);

  return { rows, totalCount: countRow[0]?.value ?? 0 };
}

export async function deleteUploads(ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  await db.delete(uploadsTable).where(inArray(uploadsTable.id, [...ids]));
}

export async function listUnattachedUploads(
  owner: LibraryOwner,
  olderThan: Date,
): Promise<Array<{ id: string; storageKey: string; sizeBytes: number }>> {
  return db
    .select({
      id: uploadsTable.id,
      storageKey: uploadsTable.storageKey,
      sizeBytes: uploadsTable.sizeBytes,
    })
    .from(uploadsTable)
    .where(and(ownerFilter(owner), unattachedFilter, lt(uploadsTable.createdAt, olderThan)));
}

export async function listHouseholdStorageKeys(householdId: string): Promise<string[]> {
  const rows = await db
    .select({ key: uploadsTable.storageKey })
    .from(uploadsTable)
    .where(eq(uploadsTable.householdId, householdId));
  return rows.map((row) => row.key);
}

export async function getUsage(owner: LibraryOwner) {
  const rows = await db
    .select({
      kind: uploadsTable.kind,
      count: sql<number>`count(*)::int`,
      bytes: sql<number>`coalesce(sum(${uploadsTable.sizeBytes}), 0)::bigint`.mapWith(Number),
      unattachedCount: sql<number>`(count(*) filter (where ${unattachedFilter}))::int`,
      unattachedBytes:
        sql<number>`coalesce(sum(${uploadsTable.sizeBytes}) filter (where ${unattachedFilter}), 0)::bigint`.mapWith(
          Number,
        ),
    })
    .from(uploadsTable)
    .where(ownerFilter(owner))
    .groupBy(uploadsTable.kind);

  return rows;
}

export async function getMemberRole(userId: string, householdId: string) {
  const [row] = await db
    .select({ role: householdMembersTable.role })
    .from(householdMembersTable)
    .where(
      and(
        eq(householdMembersTable.userId, userId),
        eq(householdMembersTable.householdId, householdId),
      ),
    )
    .limit(1);
  return row?.role;
}

// ─── Attachments ─────────────────────────────────────────────────────────

export async function getAttachment(id: string): Promise<AttachmentWithUpload | undefined> {
  const [row] = await db
    .select({ attachment: attachmentsTable, upload: uploadSelection })
    .from(attachmentsTable)
    .innerJoin(uploadsTable, eq(uploadsTable.id, attachmentsTable.uploadId))
    .where(eq(attachmentsTable.id, id));
  return row;
}

export async function findAttachment(
  uploadId: string,
  targetType: string,
  targetId: string,
  role: string,
): Promise<AttachmentRecord | undefined> {
  const [row] = await db
    .select()
    .from(attachmentsTable)
    .where(
      and(
        eq(attachmentsTable.uploadId, uploadId),
        eq(attachmentsTable.targetType, targetType),
        eq(attachmentsTable.targetId, targetId),
        eq(attachmentsTable.role, role),
      ),
    );
  return row;
}

export async function deleteAttachmentsForTargetRole(
  executor: Executor,
  targetType: string,
  targetId: string,
  role: string,
): Promise<void> {
  await executor
    .delete(attachmentsTable)
    .where(
      and(
        eq(attachmentsTable.targetType, targetType),
        eq(attachmentsTable.targetId, targetId),
        eq(attachmentsTable.role, role),
      ),
    );
}

export async function nextPosition(
  executor: Executor,
  targetType: string,
  targetId: string,
  role: string,
): Promise<number> {
  const [row] = await executor
    .select({ value: max(attachmentsTable.position) })
    .from(attachmentsTable)
    .where(
      and(
        eq(attachmentsTable.targetType, targetType),
        eq(attachmentsTable.targetId, targetId),
        eq(attachmentsTable.role, role),
      ),
    );
  return (row?.value ?? -1) + 1;
}

export async function insertAttachment(
  executor: Executor,
  values: Omit<typeof attachmentsTable.$inferInsert, "id" | "createdAt">,
): Promise<AttachmentRecord> {
  const [row] = await executor.insert(attachmentsTable).values(values).returning();
  if (!row) throw new Error("Failed to create attachment");
  return row;
}

export async function deleteAttachment(id: string): Promise<void> {
  await db.delete(attachmentsTable).where(eq(attachmentsTable.id, id));
}

export async function listAttachmentsForTargets(
  targetType: string,
  targetIds: readonly string[],
  filters: { role?: string; householdId?: string },
): Promise<AttachmentWithUpload[]> {
  if (targetIds.length === 0) return [];

  return db
    .select({ attachment: attachmentsTable, upload: uploadSelection })
    .from(attachmentsTable)
    .innerJoin(uploadsTable, eq(uploadsTable.id, attachmentsTable.uploadId))
    .where(
      and(
        eq(attachmentsTable.targetType, targetType),
        inArray(attachmentsTable.targetId, [...targetIds]),
        filters.role ? eq(attachmentsTable.role, filters.role) : undefined,
        filters.householdId ? eq(uploadsTable.householdId, filters.householdId) : undefined,
      ),
    )
    .orderBy(asc(attachmentsTable.position), asc(attachmentsTable.createdAt));
}

/** User ids this upload is currently the profile picture of. */
export async function listUserTargetsOfUpload(uploadId: string): Promise<string[]> {
  const rows = await db
    .select({ targetId: attachmentsTable.targetId })
    .from(attachmentsTable)
    .where(and(eq(attachmentsTable.uploadId, uploadId), eq(attachmentsTable.targetType, "user")));
  return rows.map((row) => row.targetId);
}
