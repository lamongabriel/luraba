import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '@/shared/errors';
import { logger } from '@/shared/logger';
import { sendError } from '@/shared/response';

type ValidationIssue = ZodError['issues'][number];

function formatZodIssue(issue: ValidationIssue): string {
  const field = String(issue.path.join('.'));

  if (issue.code === 'invalid_value' && 'values' in issue && Array.isArray(issue.values)) {
    const values = issue.values.map((value) => String(value)).join(', ');
    return field ? `${field}: must be one of ${values}` : `Must be one of ${values}`;
  }

  return field ? `${field}: ${issue.message}` : issue.message;
}

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    const message = err.issues.map(formatZodIssue).join(', ');
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
