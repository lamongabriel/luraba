import type { HouseholdContext } from '@/config/permissions';
import { ConflictError, NotFoundError, ValidationError } from '@/shared/errors';
import { categoriesRepository } from './categories.repository';
import type {
  Category,
  CategoryRecord,
  CreateCategoryRequestBody,
} from './categories.types';

function mapCategoryRecord(category: CategoryRecord): Category {
  return {
    id: category.id,
    name: category.name,
    parentId: category.parentId ?? null,
    type: category.type,
    color: category.color ?? null,
    icon: category.icon ?? null,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

export async function createCategory(context: HouseholdContext, body: CreateCategoryRequestBody): Promise<Category> {
  const existing = await categoriesRepository.findByHouseholdAndName(context, body.name);
  if (existing) {
    throw new ConflictError('A category with this name already exists');
  }

  if (body.parentId) {
    const parent = await categoriesRepository.get(body.parentId, context);
    if (!parent) {
      throw new NotFoundError('Parent category');
    }

    if (parent.type !== body.type) {
      throw new ValidationError('Parent category type must match child category type');
    }
  }

  const created = await categoriesRepository.create(context, {
    name: body.name,
    parentId: body.parentId,
    type: body.type,
    color: body.color,
    icon: body.icon,
  });

  return mapCategoryRecord(created);
}

export async function listCategories(context: HouseholdContext): Promise<Category[]> {
  const categories = await categoriesRepository.list(context);
  return categories.map(mapCategoryRecord);
}
