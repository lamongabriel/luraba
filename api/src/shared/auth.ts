import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
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

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}

export const REFRESH_COOKIE_NAME = 'luraba_refresh_token';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export function signAccessToken(userId: number, email: string): string {
  return jwt.sign({ sub: String(userId), email }, JWT_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRES_IN,
  });
}

export function signRefreshToken(userId: number, email: string): string {
  return jwt.sign({ sub: String(userId), email, type: 'refresh' }, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  });
}

export function verifyAccessToken(token: string): AccessPayload {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
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
    const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    if (!payload?.sub || !payload?.email || payload.type !== 'refresh') {
      throw new UnauthorizedError('Invalid refresh token');
    }
    return { sub: String(payload.sub), email: String(payload.email), type: 'refresh' };
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
}