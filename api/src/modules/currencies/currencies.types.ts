import { currenciesTable } from '@/db/schemas/currencies.schema';

export type Currency = typeof currenciesTable.$inferSelect;
