import type { HouseholdContext } from "@/config/permissions";
import { NotFoundError } from "@/shared/errors";
import { mapDetailedRows } from "./transactions.helpers";
import * as transactionsRepository from "./transactions.repository";

/** The slice of a transaction that other modules show next to a record linked to it. */
export type LinkedTransaction = {
  id: string;
  description: string;
  amount: number;
  currencyCode: string;
  postedDate: string;
};

function toLinked(transaction: ReturnType<typeof mapDetailedRows>[number]): LinkedTransaction {
  return {
    id: transaction.id,
    description: transaction.description,
    amount: transaction.amount,
    currencyCode: transaction.currencyCode,
    postedDate: transaction.postedDate,
  };
}

/** Loads the household's transactions by id, keyed by id. Unknown ids are left out. */
export async function loadLinkedTransactions(
  context: HouseholdContext,
  transactionIds: readonly (string | null)[],
): Promise<Map<string, LinkedTransaction>> {
  const ids = [...new Set(transactionIds.filter((id): id is string => id !== null))];
  const found = await transactionsRepository.listDetailedByTransactionIds(context, ids);
  return new Map(
    mapDetailedRows(found).map((transaction) => [transaction.id, toLinked(transaction)]),
  );
}

/** One of the household's transactions, or a not-found error for any other household's id. */
export async function requireLinkedTransaction(
  context: HouseholdContext,
  transactionId: string,
): Promise<LinkedTransaction> {
  const transaction = (await loadLinkedTransactions(context, [transactionId])).get(transactionId);
  if (!transaction) throw new NotFoundError("Transaction");
  return transaction;
}
