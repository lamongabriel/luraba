import { defineConfig } from 'drizzle-kit';
import { env } from './src/config/env';

export default defineConfig({
  out: './src/db/migrations',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    database: env.dbName,
    host: env.dbHost,
    port: env.dbPort,
    user: env.dbUser,
    password: env.dbPassword,
    ssl: env.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
  },
  verbose: true,
  strict: true,
});
