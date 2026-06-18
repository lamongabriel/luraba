import { config as loadEnv } from 'dotenv';
import { z } from 'zod';
import {
  booleanEnvSchema,
  getOptionalCredentialPair,
  hexSecretEnvSchema,
  optionalCredentialPairEnvShape,
  secretEnvSchema,
  urlEnvSchema,
  validateOptionalCredentialPairs,
} from '@/shared/validation/env';

loadEnv({ path: process.env.DOTENV_CONFIG_PATH, override: true });

const socialAuthProviderDefinitions = [
  { prefix: 'GOOGLE', providerName: 'Google' },
  { prefix: 'GITHUB', providerName: 'GitHub' },
] as const;

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(8080),
    BASE_URL: urlEnvSchema,
    FRONTEND_ORIGIN: urlEnvSchema.default('http://localhost:3000'),
    LOG_LEVEL: z.string().min(1).default('info'),
    DB_HOST: z.string().min(1).default('localhost'),
    DB_PORT: z.coerce.number().int().positive().default(5432),
    DB_NAME: z.string().min(1).default('drizzle_express_api'),
    DB_USER: z.string().min(1).default('postgres'),
    DB_PASSWORD: z.string().min(1).default('postgres'),
    AUTH_SECRET: secretEnvSchema({
      key: 'AUTH_SECRET',
      minLength: 32,
      minLengthMessage:
        'AUTH_SECRET must be at least 32 characters. Generate a high-entropy value with `openssl rand -base64 32`.',
    }),
    ...optionalCredentialPairEnvShape('GOOGLE'),
    ...optionalCredentialPairEnvShape('GITHUB'),
    INTEGRATIONS_ENCRYPTION_KEY: hexSecretEnvSchema('INTEGRATIONS_ENCRYPTION_KEY', 64),
    RUN_DB_TESTS: booleanEnvSchema.default(false),
  })
  .superRefine((data, ctx) =>
    validateOptionalCredentialPairs(data, ctx, socialAuthProviderDefinitions),
  );

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error(
    `Invalid environment configuration:\n${parsedEnv.error.issues
      .map((issue) => `- ${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('\n')}`,
  );
}

const googleAuthProvider = getOptionalCredentialPair(parsedEnv.data, 'GOOGLE');
const githubAuthProvider = getOptionalCredentialPair(parsedEnv.data, 'GITHUB');

export const env = {
  nodeEnv: parsedEnv.data.NODE_ENV,
  port: parsedEnv.data.PORT,
  baseUrl: parsedEnv.data.BASE_URL,
  frontendOrigin: parsedEnv.data.FRONTEND_ORIGIN,
  logLevel: parsedEnv.data.LOG_LEVEL,
  dbHost: parsedEnv.data.DB_HOST,
  dbPort: parsedEnv.data.DB_PORT,
  dbName: parsedEnv.data.DB_NAME,
  dbUser: parsedEnv.data.DB_USER,
  dbPassword: parsedEnv.data.DB_PASSWORD,
  authSecret: parsedEnv.data.AUTH_SECRET,
  authProviders: {
    google: googleAuthProvider,
    github: githubAuthProvider,
  },
  integrationsEncryptionKey: parsedEnv.data.INTEGRATIONS_ENCRYPTION_KEY,
  runDbTests: parsedEnv.data.RUN_DB_TESTS,
} as const;

export type Env = typeof env;
