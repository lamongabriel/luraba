import { afterEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };
const testEnvDefaults = {
  DOTENV_CONFIG_PATH: '/tmp/luraba-api-env.unit.test.missing',
  NODE_ENV: 'test',
  PORT: '8080',
  BASE_URL: 'http://localhost:8080',
  FRONTEND_ORIGIN: 'http://localhost:3000',
  LOG_LEVEL: 'warn',
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_NAME: 'luraba_db_test',
  DB_USER: 'luraba',
  DB_PASSWORD: 'luraba',
  AUTH_SECRET: 'test_auth_secret_that_is_at_least_32_chars_long',
  GOOGLE_CLIENT_ID: '',
  GOOGLE_CLIENT_SECRET: '',
  GITHUB_CLIENT_ID: '',
  GITHUB_CLIENT_SECRET: '',
  SMTP_PROVIDER: '',
  SMTP_HOST: '',
  SMTP_PORT: '',
  SMTP_SECURE: '',
  SMTP_USERNAME: '',
  SMTP_PASSWORD: '',
  SMTP_FROM_NAME: '',
  SMTP_FROM_EMAIL: '',
  SMTP_REPLY_EMAIL: '',
  SMTP_TLS_CIPHERS: '',
  INTEGRATIONS_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  RUN_DB_TESTS: '0',
} as const;

async function loadEnvModule(overrides: Record<string, string | undefined> = {}) {
  vi.resetModules();

  process.env = {
    ...originalEnv,
    ...testEnvDefaults,
  };

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }

  return import('@/config/env');
}

afterEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
});

describe('env config', () => {
  it('parses RUN_DB_TESTS into a boolean', async () => {
    const disabledEnv = (await loadEnvModule()).env;
    const enabledEnv = (await loadEnvModule({ RUN_DB_TESTS: 'true' })).env;

    expect(disabledEnv.runDbTests).toBe(false);
    expect(enabledEnv.runDbTests).toBe(true);
  });

  it('treats blank social provider credentials as disabled', async () => {
    const { env } = await loadEnvModule({
      GOOGLE_CLIENT_ID: '   ',
      GOOGLE_CLIENT_SECRET: '',
      GITHUB_CLIENT_ID: '',
      GITHUB_CLIENT_SECRET: '   ',
    });

    expect(env.authProviders.google).toEqual({
      clientId: undefined,
      clientSecret: undefined,
      enabled: false,
    });
    expect(env.authProviders.github).toEqual({
      clientId: undefined,
      clientSecret: undefined,
      enabled: false,
    });
  });

  it('enables configured social providers only when both credentials are present', async () => {
    const { env } = await loadEnvModule({
      GOOGLE_CLIENT_ID: 'google-client-id',
      GOOGLE_CLIENT_SECRET: 'google-client-secret',
      GITHUB_CLIENT_ID: 'github-client-id',
      GITHUB_CLIENT_SECRET: 'github-client-secret',
    });

    expect(env.authProviders.google).toEqual({
      clientId: 'google-client-id',
      clientSecret: 'google-client-secret',
      enabled: true,
    });
    expect(env.authProviders.github).toEqual({
      clientId: 'github-client-id',
      clientSecret: 'github-client-secret',
      enabled: true,
    });
  });

  it('rejects a provider with only one credential configured', async () => {
    await expect(
      loadEnvModule({
        GOOGLE_CLIENT_ID: 'google-client-id',
        GOOGLE_CLIENT_SECRET: '',
      }),
    ).rejects.toThrow(
      'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must both be set to enable Google auth.',
    );
  });

  it('rejects invalid secret values', async () => {
    await expect(
      loadEnvModule({
        AUTH_SECRET: ' bad-secret-with-whitespace ',
      }),
    ).rejects.toThrow('AUTH_SECRET must not have leading or trailing whitespace.');

    await expect(
      loadEnvModule({
        INTEGRATIONS_ENCRYPTION_KEY: 'not-a-hex-secret',
      }),
    ).rejects.toThrow('INTEGRATIONS_ENCRYPTION_KEY must be a 64-character hex string');
  });

  it('treats empty and partial SMTP settings as optional configuration', async () => {
    const emptyMail = (await loadEnvModule()).env.mail;
    const partialMail = (
      await loadEnvModule({
        SMTP_PROVIDER: 'resend',
        SMTP_HOST: 'smtp.resend.com',
      })
    ).env.mail;

    expect(emptyMail).toEqual({
      provider: undefined,
      host: undefined,
      port: undefined,
      secure: undefined,
      username: undefined,
      password: undefined,
      fromName: undefined,
      fromEmail: undefined,
      replyEmail: undefined,
      tlsCiphers: undefined,
    });
    expect(partialMail).toMatchObject({
      provider: 'resend',
      host: 'smtp.resend.com',
      port: undefined,
    });
  });

  it('parses a complete SMTP configuration', async () => {
    const { env } = await loadEnvModule({
      SMTP_PROVIDER: 'resend',
      SMTP_HOST: 'smtp.resend.com',
      SMTP_PORT: '465',
      SMTP_SECURE: 'true',
      SMTP_USERNAME: 'resend',
      SMTP_PASSWORD: 're_test',
      SMTP_FROM_NAME: 'Luraba',
      SMTP_FROM_EMAIL: 'team@example.com',
      SMTP_REPLY_EMAIL: 'reply@example.com',
      SMTP_TLS_CIPHERS: 'TLS_AES_256_GCM_SHA384',
    });

    expect(env.mail).toEqual({
      provider: 'resend',
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      username: 'resend',
      password: 're_test',
      fromName: 'Luraba',
      fromEmail: 'team@example.com',
      replyEmail: 'reply@example.com',
      tlsCiphers: 'TLS_AES_256_GCM_SHA384',
    });
  });

  it('rejects invalid supplied SMTP values', async () => {
    await expect(loadEnvModule({ SMTP_PORT: '70000' })).rejects.toThrow('SMTP_PORT');
    await expect(loadEnvModule({ SMTP_SECURE: 'sometimes' })).rejects.toThrow('SMTP_SECURE');
    await expect(loadEnvModule({ SMTP_FROM_EMAIL: 'invalid' })).rejects.toThrow('SMTP_FROM_EMAIL');
    await expect(loadEnvModule({ SMTP_REPLY_EMAIL: 'invalid' })).rejects.toThrow(
      'SMTP_REPLY_EMAIL',
    );
  });
});
