import { Request, Response, NextFunction } from 'express';
import { getAuthenticatedUser } from '@/middleware/auth.middleware';
import { sendCreated, sendNoContent, sendSuccess } from '@/shared/response';
import * as usersService from './users.service';
import {
  createUserSchema,
  updatePreferencesSchema,
  updateUserSchema,
  userIdParamSchema,
} from './users.types';

export async function getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const users = await usersService.getAllUsers();
    sendSuccess(res, users);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = userIdParamSchema.parse(req.params);
    const user = await usersService.getUserById(id);
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = createUserSchema.parse(req.body);
    const user = await usersService.createUser(dto);
    sendCreated(res, user);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = userIdParamSchema.parse(req.params);
    const dto = updateUserSchema.parse(req.body);
    const user = await usersService.updateUser(id, dto);
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = userIdParamSchema.parse(req.params);
    await usersService.deleteUser(id);
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
}

export async function getMyPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authUser = getAuthenticatedUser(req);
    const preferences = await usersService.getUserPreferences(authUser.id);
    sendSuccess(res, preferences);
  } catch (err) {
    next(err);
  }
}

export async function updateMyPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authUser = getAuthenticatedUser(req);
    const dto = updatePreferencesSchema.parse(req.body);
    const preferences = await usersService.updateUserPreferences(authUser.id, dto);
    sendSuccess(res, preferences);
  } catch (err) {
    next(err);
  }
}