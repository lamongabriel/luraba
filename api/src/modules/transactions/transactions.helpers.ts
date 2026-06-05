import { ValidationError } from '@/shared/errors';
import { formatDateOnly } from '@/shared/lib/date';
import type * as txRepository from './transactions.repository';
import type { TransactionResponse } from './transactions.types';

export type DetailedTransactionRow = Awaited<
  ReturnType<typeof txRepository.listDetailedByHouseholdId>
>[number];

type ConvertTransferAmount = (input: {
  amount: number;
  fromCurrencyCode: string;
  toCurrencyCode: string;
  date: Date;
}) => Promise<number>;

export function absoluteAmount(value: number): number {
  return value < 0 ? -value : value;
}

export function toRawLedgerBalance(balance: number, classification: 'asset' | 'liability'): number {
  return classification === 'asset' ? balance : -balance;
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
    const tags = Array.from(
      new Map(
        group
          .filter((row) => row.tagId && row.tagName)
          .map((row) => [
            row.tagId as string,
            {
              id: row.tagId as string,
              name: row.tagName as string,
              color: row.tagColor ?? null,
              icon: row.tagIcon ?? null,
            },
          ]),
      ).values(),
    );
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
        paymentMethodId: first.paymentMethodId ?? null,
        paymentMethodCode: first.paymentMethodCode ?? null,
        paymentMethodName: first.paymentMethodName ?? null,
        paymentMethodScope: first.paymentMethodId
          ? first.paymentMethodScope
            ? 'household'
            : 'system'
          : null,
        paymentMethodTranslationKey: first.paymentMethodTranslationKey ?? null,
        tags,
        includeInBudget: first.includeInBudget,
        purchaseDate: formatDateOnly(first.purchaseDate),
        postedDate: formatDateOnly(first.postedDate),
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
      paymentMethodId: first.paymentMethodId ?? null,
      paymentMethodCode: first.paymentMethodCode ?? null,
      paymentMethodName: first.paymentMethodName ?? null,
      paymentMethodScope: first.paymentMethodId
        ? first.paymentMethodScope
          ? 'household'
          : 'system'
        : null,
      paymentMethodTranslationKey: first.paymentMethodTranslationKey ?? null,
      tags,
      includeInBudget: first.includeInBudget,
      purchaseDate: formatDateOnly(first.purchaseDate),
      postedDate: formatDateOnly(first.postedDate),
      createdAt: first.createdAt,
      updatedAt: first.updatedAt,
    };
  });
}
