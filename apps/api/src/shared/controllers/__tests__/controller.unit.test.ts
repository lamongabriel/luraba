import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { withApiMeta } from '@/shared/response';
import { createHandler } from '../controller';

const responseSchema = z.object({ id: z.uuid() });
const metaSchema = z.object({
  pagination: z.object({
    page: z.number().int().positive(),
    perPage: z.number().int().positive(),
    totalCount: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});

function request(): Request {
  return { body: {}, params: {}, query: {} } as Request;
}

function response() {
  const res = {
    json: vi.fn(),
    send: vi.fn(),
    status: vi.fn(),
  } as unknown as Response;
  vi.mocked(res.status).mockReturnValue(res);
  return res;
}

describe('createHandler contract boundary', () => {
  it('parses service data and metadata before sending', async () => {
    const res = response();
    const next = vi.fn();
    const handler = createHandler({
      response: responseSchema,
      meta: metaSchema,
      handle: async () =>
        withApiMeta(
          { id: '8ba1a21a-f0c7-475d-a91d-cad8349ff6c9' },
          { pagination: { page: 1, perPage: 20, totalCount: 0, totalPages: 0 } },
        ),
    });

    await handler(request(), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { id: '8ba1a21a-f0c7-475d-a91d-cad8349ff6c9' },
      meta: { pagination: { page: 1, perPage: 20, totalCount: 0, totalPages: 0 } },
    });
  });

  it('rejects invalid service output instead of sending it', async () => {
    const res = response();
    const next = vi.fn();
    const handler = createHandler({
      response: responseSchema,
      handle: async () => ({ id: 'not-a-uuid' }),
    });

    await handler(request(), res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
