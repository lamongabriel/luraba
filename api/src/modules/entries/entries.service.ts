import type { TxClient } from '@/db/types';
import { ValidationError } from '@/shared/errors';
import { MAX_SAFE_MINOR_UNITS } from '@/shared/validation/money';
import { entriesRepository } from './entries.repository';
import type { EntryDraft } from './entries.types';

export function validateEntryAmount(amount: number): void {
  if (!Number.isSafeInteger(amount)) {
    throw new ValidationError(
      `Entry amount must be an integer between ${-MAX_SAFE_MINOR_UNITS} and ${MAX_SAFE_MINOR_UNITS}`,
    );
  }

  if (amount === 0) {
    throw new ValidationError('Entry amount cannot be zero');
  }
}

export function validateBalancedEntries(entries: EntryDraft[]): void {
  if (entries.length < 2) {
    throw new ValidationError('Every transaction must create at least two entries');
  }

  const sumsByCurrency = new Map<string, bigint>();

  for (const entry of entries) {
    validateEntryAmount(entry.amount);
    const current = sumsByCurrency.get(entry.currencyCode) ?? 0n;
    sumsByCurrency.set(entry.currencyCode, current + BigInt(entry.amount));
  }

  for (const [currencyCode, total] of sumsByCurrency.entries()) {
    if (total !== 0n) {
      throw new ValidationError(`Entries are not balanced for currency ${currencyCode}`);
    }
  }
}

export async function createTransactionEntries(
  tx: TxClient,
  transactionId: string,
  entries: EntryDraft[],
): Promise<void> {
  validateBalancedEntries(entries);

  await entriesRepository.createMany(
    tx,
    entries.map((entry) => ({
      transactionId,
      ledgerAccountId: entry.ledgerAccountId,
      amount: entry.amount,
      currencyId: entry.currencyCode,
      categoryId: entry.categoryId,
      budgetMonth: entry.budgetMonth,
    })),
  );
}
