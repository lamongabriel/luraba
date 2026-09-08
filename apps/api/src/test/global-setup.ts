import { pool } from "@/db";
import { ensureTestDatabase, migrateTestDatabase } from "./db";

export default async function globalSetup() {
  await ensureTestDatabase();
  await migrateTestDatabase();

  return async () => {
    await pool.end();
  };
}
