import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import app from '@/app';
import { pool } from '@/db';
import { fxProvidersById } from '@/modules/fx/fx.providers';

describe('health route', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('GET /health returns api, db, and fx provider status', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [], rowCount: 1 } as never);
    vi.spyOn(fxProvidersById.frankfurter, 'healthCheck').mockResolvedValue();
    vi.spyOn(fxProvidersById['yahoo-finance2'], 'healthCheck').mockResolvedValue();

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.services.api.status).toBe('up');
    expect(response.body.services.db.status).toBe('up');
    expect(response.body.services.fxProviders.frankfurter.status).toBe('up');
    expect(response.body.services.fxProviders['yahoo-finance2'].status).toBe('up');
    expect(response.body.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it('GET /health returns degraded when an fx provider is down', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [], rowCount: 1 } as never);
    vi.spyOn(fxProvidersById.frankfurter, 'healthCheck').mockResolvedValue();
    vi.spyOn(fxProvidersById['yahoo-finance2'], 'healthCheck').mockRejectedValue(
      new Error('Provider offline'),
    );

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('degraded');
    expect(response.body.services.db.status).toBe('up');
    expect(response.body.services.fxProviders.frankfurter.status).toBe('up');
    expect(response.body.services.fxProviders['yahoo-finance2'].status).toBe('down');
    expect(response.body.services.fxProviders['yahoo-finance2'].error).toContain(
      'Provider offline',
    );
  });

  it('GET /health returns 503 when the database is down', async () => {
    vi.spyOn(pool, 'query').mockRejectedValue(new Error('DB offline'));
    vi.spyOn(fxProvidersById.frankfurter, 'healthCheck').mockResolvedValue();
    vi.spyOn(fxProvidersById['yahoo-finance2'], 'healthCheck').mockResolvedValue();

    const response = await request(app).get('/health');

    expect(response.status).toBe(503);
    expect(response.body.status).toBe('error');
    expect(response.body.services.api.status).toBe('up');
    expect(response.body.services.db.status).toBe('down');
    expect(response.body.services.db.error).toContain('DB offline');
  });
});
