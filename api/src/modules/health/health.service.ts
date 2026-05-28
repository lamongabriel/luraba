import { pool } from '@/db';
import { fxProviderOrder, fxProvidersById } from '@/modules/fx/fx.providers';
import type { HealthResponse } from './health.types';

const PROVIDER_HEALTH_TIMEOUT_MS = 3_000;

type DependencyStatus = HealthResponse['services']['db'];

function nowIso() {
  return new Date().toISOString();
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`${label} health check timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function checkDbHealth(): Promise<DependencyStatus> {
  const checkedAt = nowIso();

  try {
    await pool.query('SELECT 1');
    return {
      status: 'up',
      checkedAt,
    };
  } catch (error) {
    return {
      status: 'down',
      checkedAt,
      error: error instanceof Error ? error.message : 'Database health check failed',
    };
  }
}

async function checkFxProviderHealth(providerId: keyof typeof fxProvidersById): Promise<DependencyStatus> {
  const checkedAt = nowIso();

  try {
    await withTimeout(fxProvidersById[providerId].healthCheck(), PROVIDER_HEALTH_TIMEOUT_MS, providerId);
    return {
      status: 'up',
      checkedAt,
    };
  } catch (error) {
    return {
      status: 'down',
      checkedAt,
      error: error instanceof Error ? error.message : `${providerId} health check failed`,
    };
  }
}

export async function getHealth(): Promise<HealthResponse> {
  const checkedAt = nowIso();
  const uptimeSeconds = process.uptime();

  const [db, fxProviderEntries] = await Promise.all([
    checkDbHealth(),
    Promise.all(
      fxProviderOrder.map(async (providerId) => [providerId, await checkFxProviderHealth(providerId)] as const),
    ),
  ]);

  const fxProviders = Object.fromEntries(fxProviderEntries);
  const hasFxFailure = Object.values(fxProviders).some((provider) => provider.status === 'down');
  const status = db.status === 'down' ? 'error' : hasFxFailure ? 'degraded' : 'ok';

  return {
    status,
    checkedAt,
    uptimeSeconds,
    services: {
      api: {
        status: 'up',
        checkedAt,
        uptimeSeconds,
      },
      db,
      fxProviders,
    },
  };
}
