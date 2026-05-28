import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),
  FRONTEND_ORIGIN: z.url().default('http://localhost:3000'),
  LOG_LEVEL: z.string().min(1).default('info'),
  DB_HOST: z.string().min(1).default('localhost'),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_NAME: z.string().min(1).default('drizzle_express_api'),
  DB_USER: z.string().min(1).default('postgres'),
  DB_PASSWORD: z.string().min(1).default('postgres'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().min(1).default('15m'),
  INTEGRATIONS_ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/, 'INTEGRATIONS_ENCRYPTION_KEY must be a 64-character hex string'),
  RUN_DB_TESTS: z.enum(['0', '1']).optional().default('0').transform((value) => value === '1'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error(
    `Invalid environment configuration:\n${parsedEnv.error.issues
      .map((issue) => `- ${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('\n')}`,
  );
}

export const env = {
  nodeEnv: parsedEnv.data.NODE_ENV,
  port: parsedEnv.data.PORT,
  frontendOrigin: parsedEnv.data.FRONTEND_ORIGIN,
  logLevel: parsedEnv.data.LOG_LEVEL,
  dbHost: parsedEnv.data.DB_HOST,
  dbPort: parsedEnv.data.DB_PORT,
  dbName: parsedEnv.data.DB_NAME,
  dbUser: parsedEnv.data.DB_USER,
  dbPassword: parsedEnv.data.DB_PASSWORD,
  jwtSecret: parsedEnv.data.JWT_SECRET,
  jwtAccessExpiresIn: parsedEnv.data.JWT_ACCESS_EXPIRES_IN,
  integrationsEncryptionKey: parsedEnv.data.INTEGRATIONS_ENCRYPTION_KEY,
  runDbTests: parsedEnv.data.RUN_DB_TESTS,
} as const;

export type Env = typeof env;
