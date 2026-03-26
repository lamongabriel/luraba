import { NextFunction, Request, Response } from 'express';
import { getAuthenticatedUser } from '@/middleware/auth.middleware';
import { sendCreated, sendSuccess } from '@/shared/response';
import * as categoriesService from './categories.service';
import { createCategorySchema } from './categories.types';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getAuthenticatedUser(req);
    const dto = createCategorySchema.parse(req.body);
    const category = await categoriesService.createCategory(user.id, dto);
    sendCreated(res, category);
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getAuthenticatedUser(req);
    const categories = await categoriesService.listCategories(user.id);
    sendSuccess(res, categories);
  } catch (err) {
    next(err);
  }
}
