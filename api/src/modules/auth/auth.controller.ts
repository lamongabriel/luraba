import { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '@/shared/response';
import { getAuthenticatedUser } from '@/middleware/auth.middleware';
import * as authService from './auth.service';
import { loginSchema, registerSchema } from './auth.types';

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = registerSchema.parse(req.body);
    const result = await authService.register(dto);

    sendSuccess(res, {
      user: result.user,
      accessToken: result.accessToken,
    }, 201);
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = loginSchema.parse(req.body);
    const result = await authService.login(dto);

    sendSuccess(res, {
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, { ok: true });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getAuthenticatedUser(req);
    const data = await authService.getMe(user.id);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}
