import { toRawBalance } from '@luraba/domain';
import { ValidationError } from '@/shared/errors';
import { formatISODate } from '@/shared/lib/date';
import type * as txRepository from './transactions.repository';
import type { TransactionFeedRow, TransactionResponse, TransactionTag } from './transactions.types';

export type DetailedTransactionRow = Awaited<
  ReturnType<typeof txRepository.listDetailedByHouseholdId>
>[number];
export type CreditCardInstallmentFeedRow = Awaited<
  ReturnType<typeof txRepository.listCreditCardInstallmentFeedRows>
>[number];

type ConvertTransferAmount = (input: {
  amount: number;
  fromCurrencyCode: string;
  toCurrencyCode: string;
  date: Date;
}) => Promise<number>;

type TagRow = {
  tagId: string | null;
  tagName: string | null;
  tagColor: string | null;
  tagIcon: string | null;
};

type PaymentMethodRow = {
  paymentMethodId: string | null;
  paymentMethodCode: string | null;
  paymentMethodName: string | null;
  paymentMethodScope: string | null;
  paymentMethodTranslationKey: string | null;
};

function mapTags(rows: TagRow[]): TransactionTag[] {
  const tags = new Map<string, TransactionTag>();

  for (const row of rows) {
    if (!row.tagId || !row.tagName || tags.has(row.tagId)) continue;

    tags.set(row.tagId, {
      id: row.tagId,
      name: row.tagName,
      color: row.tagColor,
      icon: row.tagIcon,
    });
  }

  return Array.from(tags.values());
}

function mapPaymentMethod(
  row: PaymentMethodRow,
): Pick<
  TransactionResponse,
  | 'paymentMethodId'
  | 'paymentMethodCode'
  | 'paymentMethodName'
  | 'paymentMethodScope'
  | 'paymentMethodTranslationKey'
> {
  return {
    paymentMethodId: row.paymentMethodId,
    paymentMethodCode: row.paymentMethodCode,
    paymentMethodName: row.paymentMethodName,
    paymentMethodScope: row.paymentMethodId
      ? row.paymentMethodScope
        ? 'household'
        : 'system'
      : null,
    paymentMethodTranslationKey: row.paymentMethodTranslationKey,
  };
}

export function absoluteAmount(value: number): number {
  return value < 0 ? -value : value;
}

export function toRawLedgerBalance(balance: number, classification: 'asset' | 'liability'): number {
  return toRawBalance(balance, classification);
}

export async function resolveTransferAmounts(input: {
  fromCurrencyCode: string;
  toCurrencyCode: string;
  fromAmount?: number;
  toAmount?: number;
  postedDate: Date;
  convertAmount: ConvertTransferAmount;
}): Promise<{
  fromAmount: number;
  toAmount: number;
}> {
  if (input.fromCurrencyCode === input.toCurrencyCode) {
    const amount = input.fromAmount ?? input.toAmount;
    if (amount === undefined) {
      throw new ValidationError('Either fromAmount or toAmount must be provided');
    }

    if (
      input.fromAmount !== undefined &&
      input.toAmount !== undefined &&
      input.fromAmount !== input.toAmount
    ) {
      throw new ValidationError('Same-currency transfers must use matching amounts');
    }

    return {
      fromAmount: amount,
      toAmount: amount,
    };
  }

  if (input.fromAmount !== undefined && input.toAmount !== undefined) {
    return {
      fromAmount: input.fromAmount,
      toAmount: input.toAmount,
    };
  }

  if (input.fromAmount !== undefined) {
    return {
      fromAmount: input.fromAmount,
      toAmount: await input.convertAmount({
        amount: input.fromAmount,
        fromCurrencyCode: input.fromCurrencyCode,
        toCurrencyCode: input.toCurrencyCode,
        date: input.postedDate,
      }),
    };
  }

  if (input.toAmount !== undefined) {
    return {
      fromAmount: await input.convertAmount({
        amount: input.toAmount,
        fromCurrencyCode: input.toCurrencyCode,
        toCurrencyCode: input.fromCurrencyCode,
        date: input.postedDate,
      }),
      toAmount: input.toAmount,
    };
  }

  throw new ValidationError('Either fromAmount or toAmount must be provided');
}

// The repository returns one row per joined entry/tag. The API needs one object
// per transaction, so this collapses joined rows and picks the account-facing
// entries that should be shown as source/destination amounts.
export function mapDetailedRows(rows: DetailedTransactionRow[]): TransactionResponse[] {
  const rowsByTransaction = new Map<string, DetailedTransactionRow[]>();

  for (const row of rows) {
    const grouped = rowsByTransaction.get(row.transactionId);
    if (grouped) {
      grouped.push(row);
      continue;
    }

    rowsByTransaction.set(row.transactionId, [row]);
  }

  return Array.from(rowsByTransaction.values()).map((group) => {
    const first = group[0];
    const categoryId = first.categoryId ?? null;
    const tags = mapTags(group);
    const accountEntries = group.filter((row) => row.accountId);

    if (first.type === 'transfer') {
      const fromEntry =
        accountEntries.find((row) => row.entryAmount < 0) ?? accountEntries[0] ?? null;
      const toEntry =
        accountEntries.find(
          (row) => row.entryAmount > 0 && row.accountId !== fromEntry?.accountId,
        ) ??
        accountEntries.find((row) => row.accountId !== fromEntry?.accountId) ??
        null;

      return {
        id: first.transactionId,
        type: first.type,
        description: first.description,
        amount: absoluteAmount(fromEntry?.entryAmount ?? toEntry?.entryAmount ?? 0),
        currencyCode:
          fromEntry?.entryCurrencyCode ?? toEntry?.entryCurrencyCode ?? first.entryCurrencyCode,
        toAmount: toEntry ? absoluteAmount(toEntry.entryAmount) : null,
        toCurrencyCode: toEntry?.entryCurrencyCode ?? null,
        accountId: fromEntry?.accountId ?? null,
        accountName: fromEntry?.accountName ?? null,
        accountClassification: fromEntry?.accountClassification ?? null,
        toAccountId: toEntry?.accountId ?? null,
        toAccountName: toEntry?.accountName ?? null,
        toAccountClassification: toEntry?.accountClassification ?? null,
        categoryId,
        merchantId: first.merchantId ?? null,
        ...mapPaymentMethod(first),
        tags,
        includeInBudget: first.includeInBudget,
        purchaseDate: formatISODate(first.purchaseDate),
        postedDate: formatISODate(first.postedDate),
        createdAt: first.createdAt,
        updatedAt: first.updatedAt,
      };
    }

    const accountEntry = accountEntries[0] ?? null;

    return {
      id: first.transactionId,
      type: first.type,
      description: first.description,
      amount: absoluteAmount(accountEntry?.entryAmount ?? first.entryAmount),
      currencyCode: accountEntry?.entryCurrencyCode ?? first.entryCurrencyCode,
      toAmount: null,
      toCurrencyCode: null,
      accountId: accountEntry?.accountId ?? null,
      accountName: accountEntry?.accountName ?? null,
      accountClassification: accountEntry?.accountClassification ?? null,
      toAccountId: null,
      toAccountName: null,
      toAccountClassification: null,
      categoryId,
      merchantId: first.merchantId ?? null,
      ...mapPaymentMethod(first),
      tags,
      includeInBudget: first.includeInBudget,
      purchaseDate: formatISODate(first.purchaseDate),
      postedDate: formatISODate(first.postedDate),
      createdAt: first.createdAt,
      updatedAt: first.updatedAt,
    };
  });
}

export function mapTransactionResponsesToFeedRows(
  transactions: TransactionResponse[],
  creditCardIdsByAccountId: Map<string, string> = new Map(),
  creditCardPaymentsByTransactionId: Map<
    string,
    { creditCardId: string; paymentId: string }
  > = new Map(),
): TransactionFeedRow[] {
  return transactions.map((transaction) => {
    const payment = creditCardPaymentsByTransactionId.get(transaction.id);

    return {
      ...transaction,
      rowId: transaction.id,
      rowKind: payment ? 'credit_card_payment' : 'transaction',
      originType: payment ? 'credit_card_payment' : transaction.type,
      creditCardId:
        payment?.creditCardId ??
        (transaction.accountId ? creditCardIdsByAccountId.get(transaction.accountId) : undefined) ??
        (transaction.toAccountId
          ? creditCardIdsByAccountId.get(transaction.toAccountId)
          : undefined) ??
        null,
      purchaseId: null,
      paymentId: payment?.paymentId ?? null,
      installmentId: null,
      installmentNumber: null,
      installmentCount: null,
    };
  });
}

export function mapCreditCardInstallmentRowsToFeedRows(
  rows: CreditCardInstallmentFeedRow[],
): TransactionFeedRow[] {
  const rowsByInstallment = new Map<string, CreditCardInstallmentFeedRow[]>();

  for (const row of rows) {
    const grouped = rowsByInstallment.get(row.installmentId);
    if (grouped) {
      grouped.push(row);
      continue;
    }

    rowsByInstallment.set(row.installmentId, [row]);
  }

  return Array.from(rowsByInstallment.values()).map((group) => {
    const first = group[0];
    const tags = mapTags(group);

    return {
      id: first.transactionId,
      type: 'expense',
      description: first.description,
      amount: first.amount,
      currencyCode: first.currencyCode,
      toAmount: null,
      toCurrencyCode: null,
      accountId: first.accountId,
      accountName: first.accountName,
      accountClassification: first.accountClassification,
      toAccountId: null,
      toAccountName: null,
      toAccountClassification: null,
      categoryId: first.categoryId,
      merchantId: first.merchantId ?? null,
      ...mapPaymentMethod(first),
      tags,
      includeInBudget: first.includeInBudget,
      purchaseDate: formatISODate(first.purchaseDate),
      postedDate: formatISODate(first.postedDate),
      createdAt: first.createdAt,
      updatedAt: first.updatedAt,
      rowId: first.installmentId,
      rowKind: 'credit_card_installment',
      originType: 'credit_card_installment',
      creditCardId: first.creditCardId,
      purchaseId: first.purchaseId,
      paymentId: null,
      installmentId: first.installmentId,
      installmentNumber: first.installmentNumber,
      installmentCount: first.installmentCount,
    };
  });
}
