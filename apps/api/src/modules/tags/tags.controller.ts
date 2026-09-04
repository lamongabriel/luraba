import { tagsEndpoints } from '@luraba/contracts/tags';
import { createHouseholdHandler } from '@/shared/controllers/household.controller';
import { withApiMeta } from '@/shared/response';
import * as tagsService from './tags.service';

export const create = createHouseholdHandler({
  body: tagsEndpoints.create.body,
  response: tagsEndpoints.create.response,
  handle: ({ household, body }) => tagsService.createTag(household, body),
  status: 'created',
});

export const list = createHouseholdHandler({
  query: tagsEndpoints.list.query,
  response: tagsEndpoints.list.response,
  meta: tagsEndpoints.list.meta,
  handle: async ({ household, query }) => {
    const result = await tagsService.listTags(household, query);
    return withApiMeta(result.data, result.meta);
  },
});

export const update = createHouseholdHandler({
  params: tagsEndpoints.update.params,
  body: tagsEndpoints.update.body,
  response: tagsEndpoints.update.response,
  handle: ({ household, params, body }) => tagsService.updateTag(household, params.id, body),
});

export const deleteTag = createHouseholdHandler({
  params: tagsEndpoints.delete.params,
  status: 'no-content',
  handle: ({ household, params }) => tagsService.deleteTag(household, params.id),
});
