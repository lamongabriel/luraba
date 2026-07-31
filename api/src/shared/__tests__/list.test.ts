import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  BaseListQuerySchema,
  booleanQuerySchema,
  buildIlikeSearch,
  buildOrderBy,
  combineConditions,
  commaSeparatedArraySchema,
  createListMeta,
  createListQuerySchema,
  createPaginationMeta,
  getPagination,
  nullabilityCondition,
  rangeConditions,
  validateRange,
} from '@/shared/list';

describe('shared list helpers', () => {
  it('parses base defaults and trims empty search values', () => {
    const query = BaseListQuerySchema.parse({ search: '   ' });

    expect(query).toEqual({
      page: 1,
      perPage: 20,
      search: undefined,
      sort: undefined,
      sortDirection: 'asc',
    });
  });

  it('rejects arrays, JSON sort payloads, unknown sort fields, and invalid directions', () => {
    const querySchema = createListQuerySchema({}, ['name']);

    expect(querySchema.safeParse({ sort: ['name'] }).success).toBe(false);
    expect(querySchema.safeParse({ sort: '[{"id":"name","desc":false}]' }).success).toBe(false);
    expect(querySchema.safeParse({ sort: 'createdAt' }).success).toBe(false);
    expect(querySchema.safeParse({ sort: 'name', sortDirection: 'sideways' }).success).toBe(false);
    expect(querySchema.safeParse({ unknown: 'value' }).success).toBe(false);
  });

  it('strictly parses booleans and validates inclusive ranges', () => {
    const querySchema = createListQuerySchema(
      {
        enabled: booleanQuerySchema.optional(),
        minimum: z.coerce.number().optional(),
        maximum: z.coerce.number().optional(),
      },
      ['name'],
    ).superRefine((query, ctx) => validateRange(query, ctx, 'minimum', 'maximum'));

    expect(querySchema.parse({ enabled: 'true', minimum: 10, maximum: 10 })).toMatchObject({
      enabled: true,
      minimum: 10,
      maximum: 10,
    });
    expect(querySchema.safeParse({ enabled: 'yes' }).success).toBe(false);
    expect(querySchema.safeParse({ minimum: 11, maximum: 10 }).success).toBe(false);
  });

  it('parses comma-separated array filters', () => {
    const querySchema = createListQuerySchema(
      {
        ids: commaSeparatedArraySchema(z.string().min(1)),
      },
      ['name'],
    );

    expect(querySchema.parse({ ids: 'one, two,,three' }).ids).toEqual(['one', 'two', 'three']);
  });

  it('computes pagination offsets and metadata without touching rows', () => {
    const query = BaseListQuerySchema.parse({ page: '3', perPage: '25' });

    expect(getPagination(query)).toEqual({ limit: 25, offset: 50 });
    expect(createPaginationMeta(query, 51)).toEqual({
      page: 3,
      perPage: 25,
      totalCount: 51,
      totalPages: 3,
    });
  });

  it('preserves requested page metadata for zero results and beyond-range pages', () => {
    expect(createPaginationMeta(BaseListQuerySchema.parse({}), 0)).toEqual({
      page: 1,
      perPage: 20,
      totalCount: 0,
      totalPages: 0,
    });
    expect(createPaginationMeta(BaseListQuerySchema.parse({ page: 5, perPage: 1 }), 1)).toEqual({
      page: 5,
      perPage: 1,
      totalCount: 1,
      totalPages: 1,
    });
  });

  it('attaches optional summary metadata', () => {
    const query = BaseListQuerySchema.parse({});

    expect(createListMeta(query, 0)).toEqual({
      pagination: {
        page: 1,
        perPage: 20,
        totalCount: 0,
        totalPages: 0,
      },
    });
    expect(createListMeta(query, 2, { amount: 100 })).toEqual({
      pagination: {
        page: 1,
        perPage: 20,
        totalCount: 2,
        totalPages: 1,
      },
      summary: { amount: 100 },
    });
  });

  it('builds SQL search and single-field ordering fragments', () => {
    const query = BaseListQuerySchema.parse({ sort: 'name', sortDirection: 'desc' });

    expect(buildIlikeSearch('alpha', [sql`name`])).toBeDefined();
    expect(buildOrderBy(query, { name: sql`name` }, [sql`created_at desc`])).toHaveLength(2);
    expect(
      buildOrderBy(BaseListQuerySchema.parse({}), { name: sql`name` }, [sql`created_at desc`]),
    ).toHaveLength(1);
    expect(combineConditions(sql`household_id = 'one'`, sql`name = 'two'`)).toBeDefined();
    expect(rangeConditions(sql`amount`, 10, 20)).toHaveLength(2);
    expect(nullabilityCondition(sql`institution_name`, true)).toBeDefined();
  });
});
