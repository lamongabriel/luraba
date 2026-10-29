import { createDatabase } from "@luraba/db";
import { env } from "./config/env.js";
import { logger } from "./logger.js";

export const { pool, db } = createDatabase({
  ...env.db,
  onPoolError: (err) => logger.error({ err }, "[db] Unexpected pool error"),
});
