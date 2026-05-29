import { createHouseholdHandler } from '@/shared/controllers/household.controller';
import * as tagsService from './tags.service';
import {
  CreateTagRequestBodySchema,
  CreateTagResponseSchema,
  ListTagsResponseSchema,
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
