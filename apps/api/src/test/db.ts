import path from "node:path";
import { isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { env } from "@/config/env";
import { db } from "@/db";
import { paymentMethodsTable } from "@/db/schemas/payment-methods.schema";

const TEST_REFERENCE_TABLES = ["currencies", "__drizzle_migrations"] as const;

function createPool(database: string) {
  return new Pool({
    host: env.dbHost,
    port: env.dbPort,
    database,
    user: env.dbUser,
    password: env.dbPassword,
  });
}

async function databaseExists(databaseName: string): Promise<boolean> {
  const maintenancePool = createPool("postgres");

  try {
    const result = await maintenancePool.query("SELECT 1 FROM pg_database WHERE datname = $1", [
      databaseName,
    ]);
    return result.rowCount !== 0;
  } finally {
    await maintenancePool.end();
  }
}

export async function ensureTestDatabase(): Promise<void> {
  if (!env.runDbTests) {
    throw new Error("RUN_DB_TESTS must be enabled for database-backed test runs");
  }

  if (await databaseExists(env.dbName)) {
    return;
  }

  const maintenancePool = createPool("postgres");

  try {
    await maintenancePool.query(`CREATE DATABASE "${env.dbName}"`);
  } finally {
    await maintenancePool.end();
  }
}

export async function migrateTestDatabase(): Promise<void> {
  const migrationPool = createPool(env.dbName);

  try {
    const migrationDb = drizzle(migrationPool);
    await migrate(migrationDb, {
      migrationsFolder: path.resolve(process.cwd(), "src/db/migrations"),
    });
  } finally {
    await migrationPool.end();
  }
}

let mutableTableNames: string[] | undefined;
let systemPaymentMethods: Array<typeof paymentMethodsTable.$inferSelect> | undefined;

async function listMutableTableNames(): Promise<string[]> {
  if (mutableTableNames) {
    return mutableTableNames;
  }

  const result = await db.execute<{ tablename: string }>(sql`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT IN (${sql.join(
        TEST_REFERENCE_TABLES.map((tableName) => sql`${tableName}`),
        sql`, `,
      )})
    ORDER BY tablename
  `);

  mutableTableNames = result.rows.map((row) => row.tablename);
  return mutableTableNames;
}

async function getSystemPaymentMethods(): Promise<Array<typeof paymentMethodsTable.$inferSelect>> {
  if (systemPaymentMethods) {
    return systemPaymentMethods;
  }

  const rows = await db
    .select()
    .from(paymentMethodsTable)
    .where(isNull(paymentMethodsTable.householdId));

  if (rows.length === 0) {
    throw new Error(
      "The test database is missing required system payment methods. Recreate luraba_db_test so migrations can restore reference data.",
    );
  }

  systemPaymentMethods = rows;
  return rows;
}

export async function resetTestDatabase(): Promise<void> {
  const tableNames = await listMutableTableNames();

  if (tableNames.length === 0) {
    return;
  }

  const referencePaymentMethods = await getSystemPaymentMethods();
  const truncatedTables = tableNames.map((tableName) => `"${tableName}"`).join(", ");
  await db.execute(sql.raw(`TRUNCATE TABLE ${truncatedTables} RESTART IDENTITY CASCADE`));
  await db.insert(paymentMethodsTable).values(referencePaymentMethods).onConflictDoNothing();
}
