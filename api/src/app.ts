import 'dotenv/config';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { authenticateUser } from '@/middleware/auth.middleware';
import { errorMiddleware } from '@/middleware/error.middleware';
import accountsRouter from '@/modules/accounts/accounts.routes';
import authRouter from '@/modules/auth/auth.routes';
import creditCardsRouter from '@/modules/credit-cards/credit-cards.routes';
import merchantsRouter from '@/modules/merchants/merchants.routes';
import transactionsRouter from '@/modules/transactions/transactions.routes';
import usersRouter from '@/modules/users/users.routes';
import { pool } from '@/db';
import { logger } from '@/shared/logger';

const app = express();
const PORT = process.env.PORT ?? 8080;

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000',
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
app.use('/api/v1/accounts', authenticateUser, accountsRouter);
app.use('/api/v1/cards', authenticateUser, creditCardsRouter);
app.use('/api/v1/merchants', authenticateUser, merchantsRouter);
app.use('/api/v1/transactions', authenticateUser, transactionsRouter);

// ─── Error handler (must be last) ────────────────────────────────────────────
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