import { createHouseholdHandler } from '@/shared/controllers/household.controller';
import * as tagsService from './tags.service';
import {
  CreateTagRequestBodySchema,
  CreateTagResponseSchema,
  DeleteTagRequestParamsSchema,
  ListTagsResponseSchema,
  UpdateTagRequestBodySchema,
  UpdateTagRequestParamsSchema,
  UpdateTagResponseSchema,
} from './tags.types';

export const create = createHouseholdHandler({
  body: CreateTagRequestBodySchema,
  response: CreateTagResponseSchema,
  handle: ({ household, body }) => tagsService.createTag(household, body),
  status: 'created',
});

export const list = createHouseholdHandler({
  response: ListTagsResponseSchema,
  handle: ({ household }) => tagsService.listTags(household),
});

export const update = createHouseholdHandler({
  params: UpdateTagRequestParamsSchema,
  body: UpdateTagRequestBodySchema,
  response: UpdateTagResponseSchema,
  handle: ({ household, params, body }) => tagsService.updateTag(household, params.id, body),
});

export const deleteTag = createHouseholdHandler({
  params: DeleteTagRequestParamsSchema,
  status: 'no-content',
  handle: ({ household, params }) => tagsService.deleteTag(household, params.id),
});
