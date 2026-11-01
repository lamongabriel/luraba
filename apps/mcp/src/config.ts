import { API_KEY_PREFIX } from "@luraba/contracts";
import { z } from "zod";

const configSchema = z.object({
  LURABA_API_URL: z.url().default("http://127.0.0.1:3001"),
  LURABA_API_KEY: z
    .string()
    .trim()
    .refine((value) => value.startsWith(API_KEY_PREFIX), {
      message: `must be a Luraba API key (starts with ${API_KEY_PREFIX}). Create one in Settings > API keys`,
    })
    .optional(),
  LURABA_HOUSEHOLD_ID: z.uuid().optional(),
  MCP_TRANSPORT: z.enum(["stdio", "http"]).default("stdio"),
  MCP_HTTP_HOST: z.string().min(1).default("127.0.0.1"),
  MCP_HTTP_PORT: z.coerce.number().int().min(1).max(65535).default(3333),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120_000).default(30_000),
});

export type Config = z.infer<typeof configSchema>;

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

/** Parses the environment. Messages name the variable and never echo its value (it may be a secret). */
export function loadConfig(environment: NodeJS.ProcessEnv = process.env): Config {
  const blanked = Object.fromEntries(
    Object.entries(environment).filter(([, value]) => value !== undefined && value !== ""),
  );
  const parsed = configSchema.safeParse(blanked);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`)
      .join("; ");
    throw new ConfigError(`Invalid Luraba MCP configuration. ${details}`);
  }
  const config = parsed.data;
  // The stdio transport has no per-request credentials, so the key must come from the environment.
  // The http transport can also take it from each client's Authorization header.
  if (config.MCP_TRANSPORT === "stdio" && !config.LURABA_API_KEY) {
    throw new ConfigError(
      "Invalid Luraba MCP configuration. LURABA_API_KEY: is required for the stdio transport. Create a key in Settings > API keys",
    );
  }
  return config;
}
