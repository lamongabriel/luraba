import { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '@/shared/auth';
import { UnauthorizedError } from '@/shared/errors';

export function authenticateUser(req: Request, _res: Response, next: NextFunction): void {
  const rawHeader = req.headers.authorization;
  if (!rawHeader || !rawHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid Authorization header');
  }

  const token = rawHeader.slice('Bearer '.length);
  const payload = verifyAccessToken(token);

  req.user = {
    id: Number(payload.sub),
    email: payload.email,
  };

  next();
}

export function getAuthenticatedUser(req: Request): { id: number; email: string } {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  return req.user;
}