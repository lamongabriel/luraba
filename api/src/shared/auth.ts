import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { env } from '@/config/env';
import { UnauthorizedError } from './errors';

type AccessPayload = {
  sub: string;
  email: string;
};

type RefreshPayload = {
  sub: string;
  email: string;
  type: 'refresh';
};

export const REFRESH_COOKIE_NAME = 'luraba_refresh_token';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

const accessTokenOptions: SignOptions = {
  expiresIn: env.jwtAccessExpiresIn as StringValue,
};

const refreshTokenOptions: SignOptions = {
  expiresIn: env.jwtRefreshExpiresIn as StringValue,
};

export function signAccessToken(userId: string, email: string): string {
  return jwt.sign({ sub: userId, email }, env.jwtSecret, accessTokenOptions);
}

export function signRefreshToken(userId: string, email: string): string {
  return jwt.sign({ sub: userId, email, type: 'refresh' }, env.jwtSecret, refreshTokenOptions);
}

export function verifyAccessToken(token: string): AccessPayload {
  try {
    const payload = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload;
    if (!payload?.sub || !payload?.email) {
      throw new UnauthorizedError('Invalid access token');
    }
    return { sub: String(payload.sub), email: String(payload.email) };
  } catch {
    throw new UnauthorizedError('Invalid or expired access token');
  }
}

export function verifyRefreshToken(token: string): RefreshPayload {
  try {
    const payload = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload;
    if (!payload?.sub || !payload?.email || payload.type !== 'refresh') {
      throw new UnauthorizedError('Invalid refresh token');
    }
    return { sub: String(payload.sub), email: String(payload.email), type: 'refresh' };
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
}
