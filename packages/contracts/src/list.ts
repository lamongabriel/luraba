import { z } from "zod";
import { MAX_PER_PAGE, paginationMetaSchema } from "./api.js";

export const sortDirectionSchema = z.enum(["asc", "desc"]);

const optionalTrimmedString = (maxLength: number) =>
  z.preprocess((value) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, z.string().max(maxLength).optional());

const sortFieldSchema = optionalTrimmedString(64).refine(
  (value) => value === undefined || /^[A-Za-z][A-Za-z0-9_.-]*$/.test(value),
  "Sort must be a single field name",
);

export const baseListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    perPage: z.coerce.number().int().min(1).max(MAX_PER_PAGE).default(20),
    search: optionalTrimmedString(256),
    sort: sortFieldSchema,
    sortDirection: sortDirectionSchema.default("asc"),
  })
  .strict();

export const booleanQuerySchema = z.preprocess((value) => {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return value;
}, z.boolean());

export const dateQuerySchema = z.iso.date();
export const dateTimeQuerySchema = z.iso.datetime({ offset: true });
export const temporalQuerySchema = z.union([dateQuerySchema, dateTimeQuerySchema]);

export function commaSeparatedArraySchema<TSchema extends z.ZodType>(schema: TSchema) {
  return z
    .preprocess((value) => {
      if (value === undefined) return [];
      const values = Array.isArray(value) ? value : [value];
      return values
        .flatMap((item) => String(item).split(","))
        .map((item) => item.trim())
        .filter(Boolean);
    }, z.array(schema))
    .default([]);
}

export function createListQuerySchema<TShape extends z.ZodRawShape>(
  shape: TShape,
  allowedSortFields: readonly string[],
) {
  return baseListQuerySchema
    .extend(shape)
    .strict()
    .superRefine((value, ctx) => {
      const query = value as BaseListQueryOutput;
      if (!query.sort || allowedSortFields.includes(query.sort)) return;
      ctx.addIssue({
        code: "custom",
        message: `Unsupported sort field: ${query.sort}`,
        path: ["sort"],
      });
    });
}

export function validateRange(
  value: Record<string, unknown>,
  ctx: z.RefinementCtx,
  minKey: string,
  maxKey: string,
) {
  const minimum = value[minKey];
  const maximum = value[maxKey];
  if (minimum === undefined || maximum === undefined) return;
  const ordered =
    typeof minimum === "number" && typeof maximum === "number"
      ? minimum <= maximum
      : String(minimum) <= String(maximum);
  if (ordered) return;
  ctx.addIssue({
    code: "custom",
    message: `${minKey} must be less than or equal to ${maxKey}`,
    path: [minKey],
  });
}

export function listMetaSchema() {
  return z.object({ pagination: paginationMetaSchema });
}

export function listMetaWithSummarySchema<TSummary extends z.ZodType>(summary: TSummary) {
  return z.object({ pagination: paginationMetaSchema, summary: summary.optional() });
}

export type BaseListQueryInput = z.input<typeof baseListQuerySchema>;
export type BaseListQueryOutput = z.output<typeof baseListQuerySchema>;
