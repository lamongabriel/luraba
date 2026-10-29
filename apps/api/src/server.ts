import app from "@/app";
import { env } from "@/config/env";
import { pool } from "@/db";
import { closeNotificationQueue } from "@/modules/notifications/notifications.queue";
import { logger } from "@/shared/logger";

const server = app.listen(env.port, () => {
  logger.info(`[server] Running on http://localhost:${env.port}`);
});

async function shutdown(signal: string) {
  logger.info(`[server] ${signal} received - shutting down gracefully`);
  server.close(async () => {
    await closeNotificationQueue();
    await pool.end();
    logger.info("[server] Database pool closed. Goodbye.");
    process.exit(0);
  });
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
