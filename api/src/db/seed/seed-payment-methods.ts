import { db } from '../index';
import { logger } from '../../shared/logger';
import { paymentMethodsTable } from '../schemas/payment-methods.schema';

interface PaymentMethodSeed {
  code: string;
  name: string;
  currencyId: string | null
}

const paymentMethods: Record<string, Array<Omit<PaymentMethodSeed, 'currencyId'>>> = {
  common: [
    { code: 'cash', name: 'Cash' },
    { code: 'credit_card', name: 'Credit Card' },
    { code: 'debit_card', name: 'Debit Card' },
    { code: 'paypal', name: 'PayPal' },
  ],
  USD: [
    { code: 'wire', name: 'Wire Transfer' },
  ],
  BRL: [
    { code: 'pix', name: 'Pix' },
    { code: 'boleto', name: 'Boleto' },
  ],
  CNY: [
    { code: 'alipay', name: 'Alipay' },
    { code: 'wechat_pay', name: 'WeChat Pay' },
  ],
  INR: [
    { code: 'upi', name: 'UPI' },
  ],
  ZAR: [
    { code: 'eft', name: 'EFT' },
  ],
};

export async function seedPaymentMethods() {
  const allMethods: PaymentMethodSeed[] = [];

  for (const [currency, methods] of Object.entries(paymentMethods)) {

    for (const method of methods) {
      allMethods.push({
        code: method.code,
        name: method.name,
        currencyId: currency === 'common' ? null : currency,
      });
    }
  }

  for (const method of allMethods) {
    await db.insert(paymentMethodsTable).values(method).onConflictDoNothing();
  }
  
  logger.info({ codes: allMethods.map(m => m.code) }, 'Payment methods seeded');
}
