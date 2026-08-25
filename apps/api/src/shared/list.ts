import { and, inArray, isNotNull, isNull, or, type SQL, type SQLWrapper, sql } from 'drizzle-orm';
import { z } from 'zod';

export const sortDirectionSchema = z.enum(['asc', 'desc']);

const optionalTrimmedString = (maxLength: number) =>
  z.preprocess((value) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string') return value;

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, z.string().max(maxLength).optional());

const sortFieldSchema = optionalTrimmedString(64).refine(
  (value) => value === undefined || /^[A-Za-z][A-Za-z0-9_.-]*$/.test(value),
  {
    message: 'Sort must be a single field name',
  },
);

export const BaseListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    perPage: z.coerce.number().int().min(1).max(1000).default(20),
    search: optionalTrimmedString(256),
    sort: sortFieldSchema,
    sortDirection: sortDirectionSchema.default('asc'),
  })
  .strict();

export type BaseListQuery = z.infer<typeof BaseListQuerySchema>;
export type SortDirection = z.infer<typeof sortDirectionSchema>;

export const booleanQuerySchema = z.preprocess((value) => {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return value;
}, z.boolean());

export const dateQuerySchema = z.iso.date();
export const dateTimeQuerySchema = z.iso.datetime({ offset: true });
export const temporalQuerySchema = z.union([dateQuerySchema, dateTimeQuerySchema]);

export function commaSeparatedArraySchema<TSchema extends z.ZodTypeAny>(schema: TSchema) {
  return z
    .preprocess((value) => {
      if (value === undefined) return [];

      const values = Array.isArray(value) ? value : [value];

      return values
        .flatMap((item) => String(item).split(','))
        .map((item) => item.trim())
        .filter(Boolean);
    }, z.array(schema))
    .default([]);
}

export function createListQuerySchema<TShape extends z.ZodRawShape>(
  shape: TShape,
  allowedSortFields: readonly string[],
) {
  return BaseListQuerySchema.extend(shape)
    .strict()
    .superRefine((value, ctx) => {
      const query = value as BaseListQuery;
      if (!query.sort) return;

      if (!allowedSortFields.includes(query.sort)) {
        ctx.addIssue({
          code: 'custom',
          message: `Unsupported sort field: ${query.sort}`,
          path: ['sort'],
        });
      }
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
    typeof minimum === 'number' && typeof maximum === 'number'
      ? minimum <= maximum
      : String(minimum) <= String(maximum);
  if (ordered) return;

  ctx.addIssue({
    code: 'custom',
    message: `${minKey} must be less than or equal to ${maxKey}`,
    path: [minKey],
  });
}

export interface PaginationMeta {
  page: number;
  perPage: number;
  totalCount: number;
  totalPages: number;
}

export interface ListMeta {
  pagination: PaginationMeta;
  summary?: Record<string, unknown>;
}

export interface ListResult<TItem> {
  data: TItem[];
  meta: ListMeta;
}

export interface DbListPage<TItem> {
  rows: TItem[];
  totalCount: number;
  summary?: Record<string, unknown>;
}

export function getPagination(query: Pick<BaseListQuery, 'page' | 'perPage'>) {
  return {
    limit: query.perPage,
    offset: (query.page - 1) * query.perPage,
  };
}

export function createPaginationMeta(
  query: Pick<BaseListQuery, 'page' | 'perPage'>,
  totalCount: number,
): PaginationMeta {
  return {
    page: query.page,
    perPage: query.perPage,
    totalCount,
    totalPages: totalCount === 0 ? 0 : Math.ceil(totalCount / query.perPage),
  };
}

export function createListMeta(
  query: Pick<BaseListQuery, 'page' | 'perPage'>,
  totalCount: number,
  summary?: Record<string, unknown>,
): ListMeta {
  return {
    pagination: createPaginationMeta(query, totalCount),
    ...(summary ? { summary } : {}),
  };
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

export function buildIlikeSearch(search: string | undefined, expressions: SQL[]): SQL | undefined {
  if (!search || expressions.length === 0) return undefined;

  const pattern = `%${escapeLikePattern(search)}%`;

  return or(
    ...expressions.map((expression) => sql`${expression}::text ilike ${pattern} escape '\\'`),
  );
}

export function combineConditions(...conditions: Array<SQL | undefined>): SQL | undefined {
  const defined = conditions.filter((condition): condition is SQL => condition !== undefined);
  return defined.length > 0 ? and(...defined) : undefined;
}

export function inArrayIfAny<TValue>(
  column: SQLWrapper,
  values: readonly TValue[],
): SQL | undefined {
  return values.length > 0 ? inArray(column, [...values]) : undefined;
}

export function rangeConditions<TValue>(
  expression: SQLWrapper,
  minimum: TValue | undefined,
  maximum: TValue | undefined,
): SQL[] {
  return [
    minimum === undefined ? undefined : sql`${expression} >= ${minimum}`,
    maximum === undefined ? undefined : sql`${expression} <= ${maximum}`,
  ].filter((condition): condition is SQL => condition !== undefined);
}

export function nullabilityCondition(
  expression: SQLWrapper,
  hasValue: boolean | undefined,
): SQL | undefined {
  if (hasValue === undefined) return undefined;
  return hasValue ? isNotNull(expression) : isNull(expression);
}

export function buildOrderBy(
  query: Pick<BaseListQuery, 'sort' | 'sortDirection'>,
  sortExpressions: Record<string, SQL>,
  defaultOrderBy: SQL[],
): SQL[] {
  if (!query.sort) return defaultOrderBy;

  const expression = sortExpressions[query.sort];
  if (!expression) return defaultOrderBy;

  const primaryOrder =
    query.sortDirection === 'desc' ? sql`${expression} desc` : sql`${expression} asc`;

  return [primaryOrder, ...defaultOrderBy];
}
