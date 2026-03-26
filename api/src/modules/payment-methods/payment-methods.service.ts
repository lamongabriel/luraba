import { NotFoundError } from '@/shared/errors';
import * as paymentMethodsRepository from './payment-methods.repository';
import { ListPaymentMethodsQuery, PaymentMethodResponse, mapPaymentMethodRecord } from './payment-methods.types';

export async function listPaymentMethods(query: ListPaymentMethodsQuery): Promise<PaymentMethodResponse[]> {
  if (query.currencyCode) {
    const currency = await paymentMethodsRepository.findCurrencyByCode(query.currencyCode);
    if (!currency) throw new NotFoundError('Currency');
  }

  const methods = await paymentMethodsRepository.listPaymentMethods(query.currencyCode);
  return methods.map(mapPaymentMethodRecord);
}
