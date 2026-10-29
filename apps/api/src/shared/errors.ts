export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 500,
    public readonly code: string = "INTERNAL_ERROR",
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed") {
    super(message, 422, "VALIDATION_ERROR");
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource already exists") {
    super(message, 409, "CONFLICT");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403, "FORBIDDEN");
  }
}

export class DependencyUnavailableError extends AppError {
  constructor(message = "Dependency unavailable") {
    super(message, 503, "DEPENDENCY_UNAVAILABLE");
  }
}

const UNIQUE_VIOLATION = "23505";

/**
 * True for a Postgres unique-constraint violation. Drizzle wraps the driver error, so the
 * SQLSTATE code sits on `cause`; checking only the thrown error misses it and returns a 500.
 */
export function isUniqueViolation(error: unknown): boolean {
  for (let current = error, depth = 0; current && depth < 3; depth += 1) {
    if (typeof current !== "object") return false;
    if ("code" in current && current.code === UNIQUE_VIOLATION) return true;
    current = "cause" in current ? current.cause : undefined;
  }
  return false;
}
