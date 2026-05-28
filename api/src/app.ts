import cors from 'cors';
import express from 'express';
import { env } from '@/config/env';
import { errorMiddleware } from '@/middleware/error.middleware';
import healthRouter from '@/modules/health/health.routes';
import v1Router from '@/routes/v1.routes';

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cors({ origin: env.frontendOrigin }));

  app.use('/health', healthRouter);
  app.use('/api/v1', v1Router);
  app.use(errorMiddleware);

  return app;
}

const app = createApp();

export default app;
