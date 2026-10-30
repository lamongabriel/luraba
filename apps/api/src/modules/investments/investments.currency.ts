import { currenciesRepository } from "@/modules/currencies/currencies.repository";
import { NotFoundError } from "@/shared/errors";

export async function getCurrencyOrThrow(code: string) {
  const currency = await currenciesRepository.findByCode(code.toUpperCase());
  if (!currency) throw new NotFoundError("Currency");
  return currency;
}
