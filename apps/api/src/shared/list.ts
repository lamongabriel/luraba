import type { ListMeta, ListResponse, PaginationMeta } from '@luraba/contracts/api';
import {
  type BaseListQueryOutput,
  baseListQuerySchema,
  booleanQuerySchema,
  commaSeparatedArraySchema,
  createListQuerySchema,
  dateQuerySchema,
  dateTimeQuerySchema,
  sortDirectionSchema,
  temporalQuerySchema,
  validateRange,
} from '@luraba/contracts/list';
import { and, inArray, isNotNull, isNull, or, type SQL, type SQLWrapper, sql } from 'drizzle-orm';

export type { ListMeta, PaginationMeta } from '@luraba/contracts/api';

export const BaseListQuerySchema = baseListQuerySchema;
export {
  booleanQuerySchema,
  commaSeparatedArraySchema,
  createListQuerySchema,
  dateQuerySchema,
  dateTimeQuerySchema,
  sortDirectionSchema,
  temporalQuerySchema,
  validateRange,
};

export type BaseListQuery = BaseListQueryOutput;
export type { SortDirection } from '@luraba/contracts/api';

export type ListResult<TItem> = ListResponse<TItem, Record<string, unknown>>;

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
): ListMeta<Record<string, unknown>> {
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
