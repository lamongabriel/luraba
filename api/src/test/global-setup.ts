import { pool } from '@/db';
import { seedAll } from '@/db/seed';
import { ensureTestDatabase, migrateTestDatabase } from './db';

export default async function globalSetup() {
  await ensureTestDatabase();
  await migrateTestDatabase();
  await seedAll();

  return async () => {
    await pool.end();
  };
}
