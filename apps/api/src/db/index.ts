import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/config/env";
import { logger } from "@/shared/logger";
import * as schema from "./schema";

export const pool = new Pool({
  host: env.dbHost,
  port: env.dbPort,
  database: env.dbName,
  user: env.dbUser,
  password: env.dbPassword,
  ssl: env.dbSsl ? { rejectUnauthorized: false } : false,
});

pool.on("connect", () => {
  logger.debug(`[db] New client connected (host=${env.dbHost} db=${env.dbName})`);
});

pool.on("error", (err) => {
  logger.error({ err }, "[db] Unexpected pool error");
});

export const db = drizzle(pool, { schema });

logger.info(`[db] Pool initialised (host=${env.dbHost}:${env.dbPort} db=${env.dbName})`);

export type Database = typeof db;
