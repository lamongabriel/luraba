import { config as loadEnv } from 'dotenv';
import { z } from 'zod';
import type { MailConfig } from '@/modules/mail/mail.config';
import {
  booleanEnvSchema,
  getOptionalCredentialPair,
  hexSecretEnvSchema,
  optionalBooleanEnvSchema,
  optionalCredentialPairEnvShape,
  optionalStringEnvSchema,
  secretEnvSchema,
  urlEnvSchema,
  validateOptionalCredentialPairs,
} from '@/shared/validation/env';

// Process/container variables intentionally take precedence over local dotenv files.
// This lets the root Compose stack replace host-only DB and port values safely.
// Vitest reserves BASE_URL as "/" inside workers, so restore the test dotenv value
// when that exact collision is present.
const restoreVitestBaseUrl = process.env.NODE_ENV === 'test' && process.env.BASE_URL === '/';
const loadedEnv = loadEnv({ path: process.env.DOTENV_CONFIG_PATH });

// Vitest replaces BASE_URL with "/" internally. Restore only that value from
// dotenv, while keeping explicit integration-test connection settings intact.
if (restoreVitestBaseUrl && loadedEnv.parsed?.BASE_URL) {
  process.env.BASE_URL = loadedEnv.parsed.BASE_URL;
}

// Standalone local development can override the generated .env ports without editing it.
if (process.env.LURABA_API_PORT) process.env.PORT = process.env.LURABA_API_PORT;
if (process.env.LURABA_DB_PORT) process.env.DB_PORT = process.env.LURABA_DB_PORT;

const socialAuthProviderDefinitions = [
  { prefix: 'GOOGLE', providerName: 'Google' },
  { prefix: 'GITHUB', providerName: 'GitHub' },
] as const;

const optionalPortEnvSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim().length === 0 ? undefined : value),
  z.coerce.number().int().min(1).max(65_535).optional(),
);

const optionalEmailEnvSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim().length === 0 ? undefined : value),
  z.email().optional(),
);

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(8080),
    BASE_URL: urlEnvSchema,
    FRONTEND_ORIGIN: urlEnvSchema.default('http://localhost:29670'),
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
    SMTP_PROVIDER: optionalStringEnvSchema,
    SMTP_HOST: optionalStringEnvSchema,
    SMTP_PORT: optionalPortEnvSchema,
    SMTP_SECURE: optionalBooleanEnvSchema,
    SMTP_USERNAME: optionalStringEnvSchema,
    SMTP_PASSWORD: optionalStringEnvSchema,
    SMTP_FROM_NAME: optionalStringEnvSchema,
    SMTP_FROM_EMAIL: optionalEmailEnvSchema,
    SMTP_REPLY_EMAIL: optionalEmailEnvSchema,
    SMTP_TLS_CIPHERS: optionalStringEnvSchema,
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
const mailConfig = {
  provider: parsedEnv.data.SMTP_PROVIDER,
  host: parsedEnv.data.SMTP_HOST,
  port: parsedEnv.data.SMTP_PORT,
  secure: parsedEnv.data.SMTP_SECURE,
  username: parsedEnv.data.SMTP_USERNAME,
  password: parsedEnv.data.SMTP_PASSWORD,
  fromName: parsedEnv.data.SMTP_FROM_NAME,
  fromEmail: parsedEnv.data.SMTP_FROM_EMAIL,
  replyEmail: parsedEnv.data.SMTP_REPLY_EMAIL,
  tlsCiphers: parsedEnv.data.SMTP_TLS_CIPHERS,
} satisfies MailConfig;

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
  mail: mailConfig,
  integrationsEncryptionKey: parsedEnv.data.INTEGRATIONS_ENCRYPTION_KEY,
  runDbTests: parsedEnv.data.RUN_DB_TESTS,
} as const;

export type Env = typeof env;
