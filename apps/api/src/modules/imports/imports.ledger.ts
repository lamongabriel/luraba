import { entriesTable } from "@luraba/db/schemas/entries.schema";
import { transactionsTable } from "@luraba/db/schemas/transactions.schema";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";
import { accountsRepository } from "@/modules/accounts/accounts.repository";
import * as creditCardsRepository from "@/modules/credit-cards/credit-cards.repository";
import { ledgerAccountsRepository } from "@/modules/ledger-accounts/ledger-accounts.repository";
import type { ImportBatchRecord } from "./imports.types";

export type ImportTarget = {
  type: "account" | "credit_card";
  id: string;
  name: string;
  currencyCode: string;
  /** Account type, to refuse card accounts as bank targets. */
  accountType?: string;
  ledgerAccountId: string | null;
};

/** The Luraba account or card chosen for a batch, with its ledger account. */
export async function loadTarget(
  context: HouseholdContext,
  batch: Pick<ImportBatchRecord, "sourceKind" | "targetAccountId" | "targetCreditCardId">,
): Promise<ImportTarget | null> {
  if (batch.sourceKind === "credit_card") {
    if (!batch.targetCreditCardId) return null;
    const card = await creditCardsRepository.findById(
      context.householdId,
      batch.targetCreditCardId,
    );
    if (!card) return null;
    // A card's `ledgerAccountId` is the id of its account; the ledger is looked up by owner.
    const ledger = await ledgerAccountsRepository.findByOwner("account", card.ledgerAccountId);
    return {
      type: "credit_card",
      id: card.id,
      name: card.name,
      currencyCode: card.currencyCode,
      ledgerAccountId: ledger?.id ?? null,
    };
  }
  if (!batch.targetAccountId) return null;
  const account = await accountsRepository.get(batch.targetAccountId, context);
  if (!account) return null;
  const ledger = await ledgerAccountsRepository.findByOwner("account", account.id);
  return {
    type: "account",
    id: account.id,
    name: account.name,
    currencyCode: account.currencyId,
    accountType: account.type,
    ledgerAccountId: ledger?.id ?? null,
  };
}

export type LedgerLine = {
  transactionId: string;
  date: string;
  /** Signed from the ledger account's point of view (same convention as staged rows). */
  amount: number;
  description: string;
};

export async function ledgerLinesBetween(
  householdId: string,
  ledgerAccountId: string,
  from: string,
  to: string,
): Promise<LedgerLine[]> {
  const rows = await db
    .select({
      transactionId: transactionsTable.id,
      date: transactionsTable.postedDate,
      amount: entriesTable.amount,
      description: transactionsTable.description,
    })
    .from(entriesTable)
    .innerJoin(transactionsTable, eq(transactionsTable.id, entriesTable.transactionId))
    .where(
      and(
        eq(entriesTable.ledgerAccountId, ledgerAccountId),
        eq(transactionsTable.householdId, householdId),
        gte(transactionsTable.postedDate, new Date(`${from}T00:00:00Z`)),
        lte(transactionsTable.postedDate, new Date(`${to}T00:00:00Z`)),
      ),
    )
    .orderBy(asc(transactionsTable.postedDate));
  return rows.map((row) => ({
    transactionId: row.transactionId,
    date: row.date.toISOString().slice(0, 10),
    amount: row.amount,
    description: row.description,
  }));
}
