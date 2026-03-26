import { db, pool } from '@/db';
import { currenciesTable } from '@/db/schemas/currencies.schema';

async function main(): Promise<void> {
  await db
    .insert(currenciesTable)
    .values([
      {
        code: 'BRL',
        symbol: 'R$',
        precision: 2,
      },
      {
        code: 'USD',
        symbol: '$',
        precision: 2,
      },
    ])
    .onConflictDoNothing();

  console.log('Seeded currencies: BRL, USD');
}

main()
  .catch((error: unknown) => {
    console.error('Failed to seed currencies', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
