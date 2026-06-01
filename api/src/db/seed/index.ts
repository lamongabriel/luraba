import { logger } from '../../shared/logger';
import { seedCurrencies } from './seed-currencies';
import { seedPaymentMethods } from './seed-payment-methods';

export async function seedAll() {
  await seedCurrencies();
  await seedPaymentMethods();
}

if (require.main === module) {
  seedAll()
    .then(() => {
      logger.info('All seeds completed');
    })
    .catch((err) => {
      logger.error({ err }, 'Failed to seed all');
      process.exit(1);
    });
}
