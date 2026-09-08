import { categoriesEndpoints } from "@luraba/contracts/categories";
import { createHouseholdHandler } from "@/shared/controllers/household.controller";
import { withApiMeta } from "@/shared/response";
import * as categoriesService from "./categories.service";

export const create = createHouseholdHandler({
  body: categoriesEndpoints.create.body,
  response: categoriesEndpoints.create.response,
  handle: ({ household, body }) => categoriesService.createCategory(household, body),
  status: "created",
});

export const list = createHouseholdHandler({
  query: categoriesEndpoints.list.query,
  response: categoriesEndpoints.list.response,
  meta: categoriesEndpoints.list.meta,
  handle: async ({ household, query }) => {
    const result = await categoriesService.listCategories(household, query);
    return withApiMeta(result.data, result.meta);
  },
});

export const update = createHouseholdHandler({
  params: categoriesEndpoints.update.params,
  body: categoriesEndpoints.update.body,
  response: categoriesEndpoints.update.response,
  handle: ({ household, params, body }) =>
    categoriesService.updateCategory(household, params.id, body),
});

export const deleteCategory = createHouseholdHandler({
  params: categoriesEndpoints.delete.params,
  status: "no-content",
  handle: ({ household, params }) => categoriesService.deleteCategory(household, params.id),
});
