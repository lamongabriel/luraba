import { pool } from '../../db';
import { logger } from '../../shared/logger';
import { seedMock } from './seed-mock';

async function run() {
  try {
    await seedMock();
    logger.info('Mock seed completed');
  } catch (error) {
    logger.error({ err: error }, 'Failed to seed mock data');
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void run();
