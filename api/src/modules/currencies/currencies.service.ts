import * as currenciesRepository from './currencies.repository';
import { Currency } from './currencies.types';

export async function listCurrencies(): Promise<Currency[]> {
  return currenciesRepository.listCurrencies();
}
