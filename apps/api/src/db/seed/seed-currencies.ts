import { logger } from '../../shared/logger';
import { db } from '../index';
import { currenciesTable } from '../schemas/currencies.schema';

const currencies = [
  { code: 'USD', symbol: '$', precision: 2 },
  { code: 'EUR', symbol: '€', precision: 2 },
  { code: 'BRL', symbol: 'R$', precision: 2 },
  { code: 'JPY', symbol: '¥', precision: 0 },
  { code: 'GBP', symbol: '£', precision: 2 },
  { code: 'AUD', symbol: 'A$', precision: 2 },
  { code: 'CAD', symbol: 'C$', precision: 2 },
  { code: 'CHF', symbol: 'Fr', precision: 2 },
  { code: 'CNY', symbol: '¥', precision: 2 },
  { code: 'INR', symbol: '₹', precision: 2 },
  { code: 'MXN', symbol: '$', precision: 2 },
  { code: 'ZAR', symbol: 'R', precision: 2 },
  { code: 'RUB', symbol: '₽', precision: 2 },
  { code: 'KRW', symbol: '₩', precision: 0 },
  { code: 'TRY', symbol: '₺', precision: 2 },
  { code: 'SEK', symbol: 'kr', precision: 2 },
  { code: 'SGD', symbol: 'S$', precision: 2 },
  { code: 'HKD', symbol: 'HK$', precision: 2 },
  { code: 'PLN', symbol: 'zł', precision: 2 },
];

export async function seedCurrencies() {
  for (const currency of currencies) {
    await db.insert(currenciesTable).values(currency).onConflictDoNothing();
  }

  logger.info({ codes: currencies.map((c) => c.code) }, 'Currencies seeded');
}
