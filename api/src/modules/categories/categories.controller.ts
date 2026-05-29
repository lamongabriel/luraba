import { createHouseholdHandler } from '@/shared/controllers/household.controller';
import * as categoriesService from './categories.service';
import {
  CreateCategoryRequestBodySchema,
  CreateCategoryResponseSchema,
  DeleteCategoryRequestParamsSchema,
  ListCategoriesResponseSchema,
  UpdateCategoryRequestBodySchema,
  UpdateCategoryRequestParamsSchema,
  UpdateCategoryResponseSchema,
} from './categories.types';

export const create = createHouseholdHandler({
  body: CreateCategoryRequestBodySchema,
  response: CreateCategoryResponseSchema,
  handle: ({ household, body }) => categoriesService.createCategory(household, body),
  status: 'created',
});

export const list = createHouseholdHandler({
  response: ListCategoriesResponseSchema,
  handle: ({ household }) => categoriesService.listCategories(household),
});

export const update = createHouseholdHandler({
  params: UpdateCategoryRequestParamsSchema,
  body: UpdateCategoryRequestBodySchema,
  response: UpdateCategoryResponseSchema,
  handle: ({ household, params, body }) => categoriesService.updateCategory(household, params.id, body),
});

export const deleteCategory = createHouseholdHandler({
  params: DeleteCategoryRequestParamsSchema,
  status: 'no-content',
  handle: ({ household, params }) => categoriesService.deleteCategory(household, params.id),
});
