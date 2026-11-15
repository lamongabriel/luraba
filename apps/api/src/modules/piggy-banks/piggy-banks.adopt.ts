import { accountsTable } from "@luraba/db/schemas/accounts.schema";
import { householdMembersTable, householdsTable } from "@luraba/db/schemas/households.schema";
import { piggyBanksTable } from "@luraba/db/schemas/piggy-banks.schema";
import { getTodayInTimezone } from "@luraba/domain";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { ledgerAccountsRepository } from "@/modules/ledger-accounts/ledger-accounts.repository";
import { piggyBanksRepository } from "./piggy-banks.repository";

export type AdoptStatus =
  | "created"
  | "would_create"
  | "already_adopted"
  | "account_not_found"
  | "unsupported_account";

export type AdoptResult = {
  householdId: string;
  status: AdoptStatus;
  accountName?: string;
  balance?: number;
  currencyCode?: string;
};

export const UNALLOCATED_TITLE = "Unallocated";

/**
 * Makes an existing account the parent of piggy banks: one "Unallocated" piggy bank (no yield)
 * holding the account's full balance, so nothing changes until the owner splits it. Idempotent and
 * safe to run anywhere: a missing account, a non-cash account or an account that already has piggy
 * banks (even archived) is reported and left untouched. `dryRun` writes nothing.
 */
export async function adoptAccount(input: {
  householdId: string;
  accountName: string;
  dryRun?: boolean;
}): Promise<AdoptResult> {
  const [account] = await db
    .select()
    .from(accountsTable)
    .where(
      and(
        eq(accountsTable.householdId, input.householdId),
        sql`lower(${accountsTable.name}) = lower(${input.accountName})`,
      ),
    )
    .limit(1);
  if (!account) return { householdId: input.householdId, status: "account_not_found" };
  const base = {
    householdId: input.householdId,
    accountName: account.name,
    currencyCode: account.currencyId,
  };
  if (account.type !== "cash") return { ...base, status: "unsupported_account" };

  const existing = await db
    .select({ id: piggyBanksTable.id })
    .from(piggyBanksTable)
    .where(eq(piggyBanksTable.parentAccountId, account.id))
    .limit(1);
  const ledger = await ledgerAccountsRepository.findByOwner("account", account.id);
  const balance = ledger ? await ledgerAccountsRepository.getBalance(ledger.id) : 0;
  if (existing.length > 0) return { ...base, balance, status: "already_adopted" };
  if (input.dryRun) return { ...base, balance, status: "would_create" };

  const [household] = await db
    .select({ timezone: householdsTable.timezone })
    .from(householdsTable)
    .where(eq(householdsTable.id, input.householdId));
  const [owner] = await db
    .select({ userId: householdMembersTable.userId })
    .from(householdMembersTable)
    .where(
      and(
        eq(householdMembersTable.householdId, input.householdId),
        eq(householdMembersTable.role, "owner"),
      ),
    )
    .orderBy(asc(householdMembersTable.createdAt))
    .limit(1);
  const today = getTodayInTimezone(household?.timezone ?? "America/Sao_Paulo");

  await db.transaction(async (tx) => {
    const [piggy] = await tx
      .insert(piggyBanksTable)
      .values({
        householdId: input.householdId,
        parentAccountId: account.id,
        title: UNALLOCATED_TITLE,
        description: "Everything in this account that is not split into piggy banks yet.",
        currencyCode: account.currencyId,
        emoji: "🐷",
        isUnallocated: true,
        createdByUserId: owner?.userId ?? null,
      })
      .returning({ id: piggyBanksTable.id });
    if (piggy && balance > 0) {
      await piggyBanksRepository.insertMovements(tx, [
        {
          piggyBankId: piggy.id,
          kind: "opening",
          amount: balance,
          occurredOn: today,
          note: "Opening balance when piggy banks were enabled for this account",
          createdByUserId: owner?.userId ?? null,
        },
      ]);
    }
  });
  return { ...base, balance, status: "created" };
}

/** `adoptAccount` for every household that has an account with that name. */
export async function adoptAccountEverywhere(input: {
  accountName: string;
  householdId?: string;
  dryRun?: boolean;
}): Promise<AdoptResult[]> {
  const households = input.householdId
    ? [{ id: input.householdId }]
    : await db.select({ id: householdsTable.id }).from(householdsTable);
  const results: AdoptResult[] = [];
  for (const household of households) {
    const result = await adoptAccount({
      householdId: household.id,
      accountName: input.accountName,
      dryRun: input.dryRun,
    });
    if (result.status !== "account_not_found" || input.householdId) results.push(result);
  }
  return results;
}
