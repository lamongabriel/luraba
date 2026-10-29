import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv({ path: process.env.DOTENV_CONFIG_PATH });

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim().length === 0 ? undefined : value;

const optionalString = z.preprocess(emptyToUndefined, z.string().trim().min(1).optional());
const optionalEmail = z.preprocess(emptyToUndefined, z.email().optional());
const optionalPort = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int().min(1).max(65_535).optional(),
);
const optionalBoolean = z.preprocess((value) => {
  const cleaned = emptyToUndefined(value);
  if (cleaned === "true") return true;
  if (cleaned === "false") return false;
  return cleaned;
}, z.boolean().optional());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.string().min(1).default("info"),
  FRONTEND_ORIGIN: z.url().default("http://localhost:3000"),
  DB_HOST: z.string().min(1).default("localhost"),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_NAME: z.string().min(1).default("drizzle_express_api"),
  DB_USER: z.string().min(1).default("postgres"),
  DB_PASSWORD: z.string().min(1).default("postgres"),
  DB_SSL: z.preprocess(
    (value) => (value === "true" ? true : value === "false" ? false : value),
    z.boolean().default(false),
  ),
  REDIS_URL: z.string().min(1, "REDIS_URL is required to run the worker"),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(100).default(5),
  SMTP_PROVIDER: optionalString,
  SMTP_HOST: optionalString,
  SMTP_PORT: optionalPort,
  SMTP_SECURE: optionalBoolean,
  SMTP_USERNAME: optionalString,
  SMTP_PASSWORD: optionalString,
  SMTP_FROM_NAME: optionalString,
  SMTP_FROM_EMAIL: optionalEmail,
  SMTP_REPLY_EMAIL: optionalEmail,
  SMTP_TLS_CIPHERS: optionalString,
  VAPID_PUBLIC_KEY: optionalString,
  VAPID_PRIVATE_KEY: optionalString,
  VAPID_SUBJECT: optionalString,
  SMS_PROVIDER: optionalString,
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    `Invalid worker environment configuration:\n${parsed.error.issues
      .map((issue) => `- ${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("\n")}`,
  );
}

const data = parsed.data;

export type MailConfig = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
  replyEmail?: string;
  tlsCiphers?: string;
};

const mail: MailConfig | undefined =
  data.SMTP_HOST &&
  data.SMTP_PORT !== undefined &&
  data.SMTP_SECURE !== undefined &&
  data.SMTP_USERNAME &&
  data.SMTP_PASSWORD &&
  data.SMTP_FROM_NAME &&
  data.SMTP_FROM_EMAIL
    ? {
        host: data.SMTP_HOST,
        port: data.SMTP_PORT,
        secure: data.SMTP_SECURE,
        username: data.SMTP_USERNAME,
        password: data.SMTP_PASSWORD,
        fromName: data.SMTP_FROM_NAME,
        fromEmail: data.SMTP_FROM_EMAIL,
        replyEmail: data.SMTP_REPLY_EMAIL,
        tlsCiphers: data.SMTP_TLS_CIPHERS,
      }
    : undefined;

const push =
  data.VAPID_PUBLIC_KEY && data.VAPID_PRIVATE_KEY
    ? {
        publicKey: data.VAPID_PUBLIC_KEY,
        privateKey: data.VAPID_PRIVATE_KEY,
        subject: data.VAPID_SUBJECT ?? `mailto:${data.SMTP_FROM_EMAIL ?? "admin@localhost"}`,
      }
    : undefined;

export const env = {
  nodeEnv: data.NODE_ENV,
  logLevel: data.LOG_LEVEL,
  frontendOrigin: data.FRONTEND_ORIGIN,
  db: {
    host: data.DB_HOST,
    port: data.DB_PORT,
    database: data.DB_NAME,
    user: data.DB_USER,
    password: data.DB_PASSWORD,
    ssl: data.DB_SSL,
  },
  redisUrl: data.REDIS_URL,
  concurrency: data.WORKER_CONCURRENCY,
  mail,
  push,
  smsProvider: data.SMS_PROVIDER,
} as const;
