import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { logger } from '@/shared/logger';

const {
  DB_HOST = 'localhost',
  DB_PORT = '5432',
  DB_NAME = 'drizzle_express_api',
  DB_USER = 'postgres',
  DB_PASSWORD = 'postgres',
} = process.env;

export const pool = new Pool({
  host: DB_HOST,
  port: Number(DB_PORT),
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
});

pool.on('connect', () => {
  logger.debug(`[db] New client connected (host=${DB_HOST} db=${DB_NAME})`);
});

pool.on('error', (err) => {
  logger.error({ err }, '[db] Unexpected pool error');
});

export const db = drizzle(pool, { schema });

logger.info(`[db] Pool initialised (host=${DB_HOST}:${DB_PORT} db=${DB_NAME})`);

export type Database = typeof db;