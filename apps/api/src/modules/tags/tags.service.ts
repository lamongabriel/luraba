import type { CreateTagInput, Tag, UpdateTagInput } from "@luraba/contracts/tags";
import { formatISODateTime } from "@luraba/domain";
import type { HouseholdContext } from "@/config/permissions";
import { ConflictError, NotFoundError } from "@/shared/errors";
import { createListMeta, type ListResult } from "@/shared/list";
import type { ListTagsQuery } from "./tags.query";
import { tagsRepository } from "./tags.repository";
import type { TagRecord } from "./tags.types";

function mapTagRecord(tag: TagRecord): Tag {
  return {
    id: tag.id,
    name: tag.name,
    color: tag.color ?? null,
    icon: tag.icon ?? null,
    createdAt: formatISODateTime(tag.createdAt),
    updatedAt: formatISODateTime(tag.updatedAt),
  };
}

export async function createTag(context: HouseholdContext, body: CreateTagInput): Promise<Tag> {
  const existing = await tagsRepository.findByHouseholdAndName(context, body.name);
  if (existing) {
    throw new ConflictError("A tag with this name already exists");
  }

  const created = await tagsRepository.create(context, {
    name: body.name,
    color: body.color,
    icon: body.icon,
  });

  return mapTagRecord(created);
}

export async function listTags(
  context: HouseholdContext,
  query: ListTagsQuery,
): Promise<ListResult<Tag>> {
  const page = await tagsRepository.listPage(context, query);

  return {
    data: page.rows.map(mapTagRecord),
    meta: createListMeta(query, page.totalCount),
  };
}

export async function updateTag(
  context: HouseholdContext,
  tagId: string,
  body: UpdateTagInput,
): Promise<Tag> {
  const tag = await tagsRepository.get(tagId, context);
  if (!tag) {
    throw new NotFoundError("Tag");
  }

  if (body.name && body.name !== tag.name) {
    const existing = await tagsRepository.findByHouseholdAndName(context, body.name);
    if (existing && existing.id !== tagId) {
      throw new ConflictError("A tag with this name already exists");
    }
  }

  const updated = await tagsRepository.update(tagId, context, {
    name: body.name,
    color: body.color,
    icon: body.icon,
  });

  if (!updated) {
    throw new NotFoundError("Tag");
  }

  return mapTagRecord(updated);
}

export async function deleteTag(context: HouseholdContext, tagId: string): Promise<void> {
  const deleted = await tagsRepository.delete(tagId, context);
  if (!deleted) {
    throw new NotFoundError("Tag");
  }
}
