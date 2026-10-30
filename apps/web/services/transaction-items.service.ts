"use client";

import {
  type replaceTransactionItemsBodySchema,
  type TransactionItem,
  transactionsEndpoints,
} from "@luraba/contracts";
import type { z } from "zod";
import { requestContract } from "@/services/contract-client.service";

export type ReplaceTransactionItemsInput = z.input<typeof replaceTransactionItemsBodySchema>;

export function listTransactionItems(transactionId: string): Promise<TransactionItem[]> {
  return requestContract(transactionsEndpoints.listItems, { params: { id: transactionId } });
}

export function replaceTransactionItems(
  transactionId: string,
  body: ReplaceTransactionItemsInput,
): Promise<TransactionItem[]> {
  return requestContract(transactionsEndpoints.replaceItems, {
    params: { id: transactionId },
    body,
  });
}
