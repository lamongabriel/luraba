import { toNodeHandler } from 'better-auth/node';
import cors from 'cors';
import express from 'express';
import { errorMiddleware } from '@/middleware/error.middleware';
import healthRouter from '@/modules/health/health.routes';
import v1Router from '@/routes/v1.routes';
import { auth } from '@/shared/lib/auth';
import { allowedAuthOrigins } from '@/shared/lib/auth-origins';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: allowedAuthOrigins,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
    }),
  );

  // Better Auth should run before body parsers in Express v5.
  app.all('/api/auth/*splat', toNodeHandler(auth));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/health', healthRouter);
  app.use('/api/v1', v1Router);
  app.use(errorMiddleware);

  return app;
}

const app = createApp();

export default app;
