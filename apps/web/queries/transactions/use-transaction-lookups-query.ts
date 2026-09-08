"use client";

import type {
  AccountSummary,
  Category,
  CreditCard,
  Currency,
  Merchant,
  PaymentMethod,
  Tag,
} from "@luraba/contracts";
import { MAX_PER_PAGE } from "@luraba/contracts";
import { useQuery } from "@tanstack/react-query";
import type { AppQueryOptions } from "@/queries/query-options";
import { listAccounts } from "@/services/accounts.service";
import { listCategories } from "@/services/categories.service";
import { listCreditCards } from "@/services/credit-cards.service";
import { listCurrencies } from "@/services/currencies.service";
import { listMerchants } from "@/services/merchants.service";
import { listPaymentMethods } from "@/services/payment-methods.service";
import { listTags } from "@/services/tags.service";

export const transactionLookupQueryKeys = {
  all: ["transaction-lookups"] as const,
};

export interface TransactionLookups {
  accounts: AccountSummary[];
  creditCards: CreditCard[];
  categories: Category[];
  merchants: Merchant[];
  tags: Tag[];
  paymentMethods: PaymentMethod[];
  currencies: Currency[];
}

export function useTransactionLookupsQuery<TData = TransactionLookups>(
  options?: AppQueryOptions<TransactionLookups, TData>,
) {
  return useQuery({
    queryKey: transactionLookupQueryKeys.all,
    queryFn: async () => {
      const [accounts, creditCards, categories, merchants, tags, paymentMethods, currencies] =
        await Promise.all([
          listAccounts({ perPage: MAX_PER_PAGE }),
          listCreditCards({ perPage: MAX_PER_PAGE }),
          listCategories({ perPage: MAX_PER_PAGE }),
          listMerchants({ perPage: MAX_PER_PAGE }),
          listTags({ perPage: MAX_PER_PAGE }),
          listPaymentMethods({ perPage: MAX_PER_PAGE }),
          listCurrencies({ perPage: MAX_PER_PAGE }),
        ]);

      return {
        accounts: accounts.data,
        creditCards: creditCards.data,
        categories: categories.data,
        merchants: merchants.data,
        tags: tags.data,
        paymentMethods: paymentMethods.data,
        currencies: currencies.data,
      };
    },
    ...options,
  });
}
