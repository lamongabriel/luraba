import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '@/shared/errors';
import { sendError } from '@/shared/response';
import { logger } from '@/shared/logger';

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    const message = err.issues.map((e) => `${String(e.path.join('.'))}: ${e.message}`).join(', ');
    sendError(res, 422, 'VALIDATION_ERROR', message);
    return;
  }

  // Known application errors
  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.code, err.message);
    return;
  }

  // Unknown errors — log but don't leak internals
  logger.error({ err }, '[UnhandledError] An unexpected error occurred');
  sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
}