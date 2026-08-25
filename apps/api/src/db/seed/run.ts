import { pool } from '../../db';
import { logger } from '../../shared/logger';
import { seedAll } from '.';

async function run() {
  try {
    await seedAll();
    logger.info('All seeds completed');
  } catch (err) {
    logger.error({ err }, 'Failed to seed all');
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void run();
