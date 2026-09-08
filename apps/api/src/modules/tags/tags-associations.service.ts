import type { TagSummary } from "@luraba/contracts/tags";
import { asc, eq } from "drizzle-orm";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";
import { tagsTable } from "@/db/schemas/tags.schema";
import { transactionTagsTable } from "@/db/schemas/transaction-tags.schema";
import type { TxClient } from "@/db/types";
import { NotFoundError } from "@/shared/errors";
import { tagsRepository } from "./tags.repository";

export async function validateTagIds(
  context: HouseholdContext,
  tagIds: string[] | undefined,
): Promise<string[]> {
  const normalizedTagIds = Array.from(new Set(tagIds ?? []));
  if (normalizedTagIds.length === 0) return [];

  const tags = await tagsRepository.findByIds(context, normalizedTagIds);
  if (tags.length !== normalizedTagIds.length) throw new NotFoundError("Tag");

  return normalizedTagIds;
}

export async function replaceTransactionTags(
  tx: TxClient,
  transactionId: string,
  tagIds: string[],
): Promise<void> {
  const existingRows = await tx
    .select({ tagId: transactionTagsTable.tagId, position: transactionTagsTable.position })
    .from(transactionTagsTable)
    .where(eq(transactionTagsTable.transactionId, transactionId));
  const existingPositions = new Map(existingRows.map((row) => [row.tagId, row.position]));
  const nextPosition =
    existingRows.reduce((maximum, row) => Math.max(maximum, row.position), -1) + 1;
  const uniqueTagIds = Array.from(new Set(tagIds));

  await tx
    .delete(transactionTagsTable)
    .where(eq(transactionTagsTable.transactionId, transactionId));
  if (uniqueTagIds.length === 0) return;

  await tx.insert(transactionTagsTable).values(
    uniqueTagIds.map((tagId, index) => ({
      transactionId,
      tagId,
      position: existingPositions.get(tagId) ?? nextPosition + index,
    })),
  );
}

export async function addTransactionTags(
  tx: TxClient,
  transactionId: string,
  tagIds: string[],
): Promise<void> {
  if (tagIds.length === 0) return;
  const existingRows = await tx
    .select({ tagId: transactionTagsTable.tagId, position: transactionTagsTable.position })
    .from(transactionTagsTable)
    .where(eq(transactionTagsTable.transactionId, transactionId));
  const existingTagIds = new Set(existingRows.map((row) => row.tagId));
  const nextPosition =
    existingRows.reduce((maximum, row) => Math.max(maximum, row.position), -1) + 1;
  const newTagIds = Array.from(new Set(tagIds)).filter((tagId) => !existingTagIds.has(tagId));
  if (newTagIds.length === 0) return;

  await tx.insert(transactionTagsTable).values(
    newTagIds.map((tagId, index) => ({
      transactionId,
      tagId,
      position: nextPosition + index,
    })),
  );
}

export async function listTransactionTags(transactionId: string): Promise<TagSummary[]> {
  return db
    .select({
      id: tagsTable.id,
      name: tagsTable.name,
      color: tagsTable.color,
      icon: tagsTable.icon,
    })
    .from(transactionTagsTable)
    .innerJoin(tagsTable, eq(tagsTable.id, transactionTagsTable.tagId))
    .where(eq(transactionTagsTable.transactionId, transactionId))
    .orderBy(asc(transactionTagsTable.position), asc(transactionTagsTable.tagId));
}
