import { NextFunction, Request, Response } from 'express';
import { REFRESH_COOKIE_NAME } from '@/shared/auth';
import { sendSuccess } from '@/shared/response';
import { getAuthenticatedUser } from '@/middleware/auth.middleware';
import { UnauthorizedError } from '@/shared/errors';
import * as authService from './auth.service';
import { loginSchema, registerSchema } from './auth.types';

function setRefreshCookie(res: Response, refreshToken: string): void {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = registerSchema.parse(req.body);
    const result = await authService.register(dto);
    setRefreshCookie(res, result.refreshToken);

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
    setRefreshCookie(res, result.refreshToken);

    sendSuccess(res, {
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    if (!refreshToken) throw new UnauthorizedError('Missing refresh token');

    const result = await authService.refresh(refreshToken);
    setRefreshCookie(res, result.refreshToken);

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
    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });

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