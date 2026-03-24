import type { FieldValues, Resolver } from "react-hook-form";
import type * as z from "zod/v4";

type ResolverFieldError = {
  type: string;
  message: string;
};

/**
 * Zod v4 compatible resolver for react-hook-form.
 * Uses safeParseAsync and maps issues to RHF error format.
 */
export function zodFormResolver<TFieldValues extends FieldValues>(
  schema: z.ZodType<TFieldValues>,
): Resolver<TFieldValues> {
  return async (values) => {
    const result = await schema.safeParseAsync(values);

    if (result.success) {
      return {
        values: result.data,
        errors: {},
      };
    }

    const errors: Record<string, ResolverFieldError> = {};

    for (const issue of result.error.issues) {
      const path = issue.path.join(".") || "root";

      if (!errors[path]) {
        errors[path] = {
          type: issue.code,
          message: issue.message,
        };
      }
    }

    return {
      values: {} as TFieldValues,
      errors,
    } as ReturnType<Resolver<TFieldValues>> extends Promise<infer R> ? R : never;
  };
}
