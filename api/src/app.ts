import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';

// ─── Config ──────────────────────────────────────────────────────────────────
import { env } from '@/config/env';

// ─── Infrastructure ──────────────────────────────────────────────────────────
import { pool } from '@/db';
import { authenticateUser } from '@/middleware/auth.middleware';
import { errorMiddleware } from '@/middleware/error.middleware';
import { logger } from '@/shared/logger';
import { jsonBigIntReplacer } from '@/shared/response';

// ─── Feature routes ───────────────────────────────────────────
import accountsRouter from '@/modules/accounts/accounts.routes';
import authRouter from '@/modules/auth/auth.routes';
import budgetsRouter from '@/modules/budgets/budgets.routes';
import categoriesRouter from '@/modules/categories/categories.routes';
import currenciesRouter from '@/modules/currencies/currencies.routes';
import merchantsRouter from '@/modules/merchants/merchants.routes';
import paymentMethodsRouter from '@/modules/payment-methods/payment-methods.routes';
import transactionsRouter from '@/modules/transactions/transactions.routes';
import usersRouter from '@/modules/users/users.routes';

const app = express();
const PORT = env.port;
app.set('json replacer', jsonBigIntReplacer);

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: env.frontendOrigin,
    credentials: true,
  }),
);
app.use(cookieParser());

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'up', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', db: 'down', timestamp: new Date().toISOString() });
  }
});

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', authenticateUser, usersRouter);
app.use('/api/v1/currencies', authenticateUser, currenciesRouter);
app.use('/api/v1/accounts', authenticateUser, accountsRouter);
app.use('/api/v1/budgets', authenticateUser, budgetsRouter);
app.use('/api/v1/categories', authenticateUser, categoriesRouter);
app.use('/api/v1/merchants', authenticateUser, merchantsRouter);
app.use('/api/v1/payment-methods', authenticateUser, paymentMethodsRouter);
app.use('/api/v1/transactions', authenticateUser, transactionsRouter);

// ─── Error handler ────────────────────────────────────────────
app.use(errorMiddleware);

// ─── Start ───────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`[server] Running on http://localhost:${PORT}`);
});

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info(`[server] ${signal} received — shutting down gracefully`);
  server.close(async () => {
    await pool.end();
    logger.info('[server] Database pool closed. Goodbye.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
