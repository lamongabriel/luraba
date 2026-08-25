import { env } from '@/config/env';

const localDevelopmentOrigins = [
  'http://localhost:29670',
  'http://127.0.0.1:29670',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
] as const;

function toOrigin(url: string): string {
  return new URL(url).origin;
}

function getConfiguredOrigins(): string[] {
  return [env.baseUrl, env.frontendOrigin].map(toOrigin);
}

function getDevelopmentOrigins(): string[] {
  return env.nodeEnv === 'production' ? [] : [...localDevelopmentOrigins];
}

export const allowedAuthOrigins = [
  ...new Set([...getConfiguredOrigins(), ...getDevelopmentOrigins()]),
];
