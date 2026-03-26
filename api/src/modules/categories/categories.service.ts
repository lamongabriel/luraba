import { ConflictError, NotFoundError, ValidationError } from '@/shared/errors';
import * as categoriesRepository from './categories.repository';
import { Category, CreateCategoryDto } from './categories.types';

export async function createCategory(userId: string, dto: CreateCategoryDto): Promise<Category> {
  const user = await categoriesRepository.findUserById(userId);
  if (!user) throw new NotFoundError('User');

  const existing = await categoriesRepository.findByUserAndName(userId, dto.name);
  if (existing) throw new ConflictError('A category with this name already exists');

  if (dto.parentId) {
    const parent = await categoriesRepository.findOwnedCategory(dto.parentId, userId);
    if (!parent) throw new NotFoundError('Parent category');
    if (parent.type !== dto.type) {
      throw new ValidationError('Parent category type must match child category type');
    }
  }

  return categoriesRepository.createCategory({
    userId,
    name: dto.name,
    parentId: dto.parentId,
    type: dto.type,
  });
}

export async function listCategories(userId: string): Promise<Category[]> {
  const user = await categoriesRepository.findUserById(userId);
  if (!user) throw new NotFoundError('User');

  return categoriesRepository.listByUserId(userId);
}
