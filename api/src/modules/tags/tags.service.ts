import type { HouseholdContext } from '@/config/permissions';
import { ConflictError } from '@/shared/errors';
import { tagsRepository } from './tags.repository';
import type { CreateTagRequestBody, Tag, TagRecord } from './tags.types';

function mapTagRecord(tag: TagRecord): Tag {
  return {
    id: tag.id,
    name: tag.name,
    color: tag.color ?? null,
    icon: tag.icon ?? null,
    createdAt: tag.createdAt.toISOString(),
    updatedAt: tag.updatedAt.toISOString(),
  };
}

export async function createTag(context: HouseholdContext, body: CreateTagRequestBody): Promise<Tag> {
  const existing = await tagsRepository.findByHouseholdAndName(context, body.name);
  if (existing) {
    throw new ConflictError('A tag with this name already exists');
  }

  const created = await tagsRepository.create(context, {
    name: body.name,
    color: body.color,
    icon: body.icon,
  });

  return mapTagRecord(created);
}

export async function listTags(context: HouseholdContext): Promise<Tag[]> {
  const tags = await tagsRepository.list(context);
  return tags.map(mapTagRecord);
}
