import pino from "pino";
import { env } from "./config/env.js";

export const logger = pino({
  level: env.logLevel,
  ...(env.nodeEnv !== "production" && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true, translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname" },
    },
  }),
});
