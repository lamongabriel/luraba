import { seedCurrencies } from './seed-currencies';
import { seedPaymentMethods } from './seed-payment-methods';

export async function seedAll() {
  await seedCurrencies();
  await seedPaymentMethods();
}
