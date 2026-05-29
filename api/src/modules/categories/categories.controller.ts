import { createHouseholdHandler } from '@/shared/controllers/household.controller';
import * as categoriesService from './categories.service';
import {
  CreateCategoryRequestBodySchema,
  CreateCategoryResponseSchema,
  ListCategoriesResponseSchema,
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
