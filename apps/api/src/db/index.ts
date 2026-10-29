import { createDatabase } from "@luraba/db";
import { env } from "@/config/env";
import { logger } from "@/shared/logger";

export const { pool, db } = createDatabase({
  host: env.dbHost,
  port: env.dbPort,
  database: env.dbName,
  user: env.dbUser,
  password: env.dbPassword,
  ssl: env.dbSsl,
  onPoolError: (err) => logger.error({ err }, "[db] Unexpected pool error"),
});

logger.info(`[db] Pool initialised (host=${env.dbHost}:${env.dbPort} db=${env.dbName})`);

export type { Database } from "@luraba/db";
