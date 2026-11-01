import pino from "pino";
import type { Config } from "./config.js";

const REDACT = [
  "apiKey",
  "authorization",
  "req.headers.authorization",
  "req.headers.x-api-key",
  "headers.authorization",
  "headers.x-api-key",
];

/**
 * Logs always go to stderr: on the stdio transport stdout carries the MCP protocol, so a single
 * stray line there would corrupt the session. API keys are redacted by path and never passed in.
 */
export function createLogger(config: Pick<Config, "LOG_LEVEL">) {
  return pino(
    { level: config.LOG_LEVEL, redact: { paths: REDACT, censor: "[REDACTED]" } },
    pino.destination(2),
  );
}

export type Logger = ReturnType<typeof createLogger>;
