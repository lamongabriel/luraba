import { asc, eq, isNull, or } from 'drizzle-orm';
import { db } from '@/db';
import { currenciesTable } from '@/db/schemas/currencies.schema';
import { paymentMethodsTable } from '@/db/schemas/payment-methods.schema';
import { PaymentMethodRecord } from './payment-methods.types';

export async function findCurrencyByCode(currencyCode: string): Promise<{ code: string } | undefined> {
  const rows = await db
    .select({ code: currenciesTable.code })
    .from(currenciesTable)
    .where(eq(currenciesTable.code, currencyCode));

  return rows[0];
}

export async function listPaymentMethods(currencyCode?: string): Promise<PaymentMethodRecord[]> {
  if (!currencyCode) {
    return db.select().from(paymentMethodsTable).orderBy(asc(paymentMethodsTable.name), asc(paymentMethodsTable.code));
  }

  return db
    .select()
    .from(paymentMethodsTable)
    .where(or(isNull(paymentMethodsTable.currencyId), eq(paymentMethodsTable.currencyId, currencyCode)))
    .orderBy(asc(paymentMethodsTable.name), asc(paymentMethodsTable.code));
}
