import type { HouseholdContext } from '@/config/permissions';
import { ConflictError, NotFoundError, ValidationError } from '@/shared/errors';
import { formatISODateTime } from '@/shared/lib/date';
import { categoriesRepository } from './categories.repository';
import type {
  Category,
  CategoryRecord,
  CreateCategoryRequestBody,
  UpdateCategoryRequestBody,
} from './categories.types';

function mapCategoryRecord(category: CategoryRecord): Category {
  return {
    id: category.id,
    name: category.name,
    parentId: category.parentId ?? null,
    type: category.type,
    color: category.color ?? null,
    icon: category.icon ?? null,
    createdAt: formatISODateTime(category.createdAt),
    updatedAt: formatISODateTime(category.updatedAt),
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

export async function updateCategory(
  context: HouseholdContext,
  categoryId: string,
  body: UpdateCategoryRequestBody,
): Promise<Category> {
  const category = await categoriesRepository.get(categoryId, context);
  if (!category) {
    throw new NotFoundError('Category');
  }

  if (body.name && body.name !== category.name) {
    const existing = await categoriesRepository.findByHouseholdAndName(context, body.name);
    if (existing && existing.id !== categoryId) {
      throw new ConflictError('A category with this name already exists');
    }
  }

  const nextType = body.type ?? category.type;
  const nextParentId = body.parentId === undefined ? category.parentId : body.parentId;
  if (nextParentId) {
    const parent = await categoriesRepository.get(nextParentId, context);
    if (!parent) {
      throw new NotFoundError('Parent category');
    }

    if (parent.id === categoryId) {
      throw new ValidationError('Category cannot be its own parent');
    }

    if (parent.type !== nextType) {
      throw new ValidationError('Parent category type must match child category type');
    }
  }

  const updated = await categoriesRepository.update(categoryId, context, {
    name: body.name,
    parentId: body.parentId,
    type: body.type,
    color: body.color,
    icon: body.icon,
  });

  if (!updated) {
    throw new NotFoundError('Category');
  }

  return mapCategoryRecord(updated);
}

export async function deleteCategory(context: HouseholdContext, categoryId: string): Promise<void> {
  const deleted = await categoriesRepository.delete(categoryId, context);
  if (!deleted) {
    throw new NotFoundError('Category');
  }
}
