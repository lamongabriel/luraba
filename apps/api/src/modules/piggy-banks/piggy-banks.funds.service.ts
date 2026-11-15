import { randomUUID } from "node:crypto";
import type {
  BulkDepositInput,
  DepositToPiggyBankInput,
  MovePiggyBankFundsInput,
  PiggyBankOperation,
  SetPiggyBankBalanceInput,
  WithdrawFromPiggyBankInput,
} from "@luraba/contracts/piggy-banks";
import { formatISODate, getTodayInTimezone, parseISODate } from "@luraba/domain";
import type { HouseholdContext } from "@/config/permissions";
import { SYSTEM_LEDGER_CLASSIFICATIONS } from "@/config/transactions";
import { db } from "@/db";
import type { TxClient } from "@/db/types";
import { assertNotArchived } from "@/modules/accounts/accounts.guards";
import { accountsRepository } from "@/modules/accounts/accounts.repository";
import * as entriesService from "@/modules/entries/entries.service";
import { ledgerAccountsRepository } from "@/modules/ledger-accounts/ledger-accounts.repository";
import * as txRepository from "@/modules/transactions/transactions.repository";
import * as transactionsService from "@/modules/transactions/transactions.service";
import { ConflictError, NotFoundError, ValidationError } from "@/shared/errors";
import { logger } from "@/shared/logger";
import { piggyBanksRepository } from "./piggy-banks.repository";
import { presentDetail } from "./piggy-banks.service";
import { freeBalanceOf, requireParentAccount, requirePiggyBank } from "./piggy-banks.shared";
import type { PiggyBankRecord } from "./piggy-banks.types";

const dayOrToday = (context: HouseholdContext, date: Date | undefined): Date =>
  date ? parseISODate(formatISODate(date)) : getTodayInTimezone(context.timezone);

async function assertOpen(piggy: PiggyBankRecord): Promise<void> {
  if (piggy.archivedAt) {
    throw new ConflictError(`Piggy bank "${piggy.title}" is archived. Unarchive it first.`);
  }
}

async function balanceOf(piggyId: string): Promise<number> {
  return (await piggyBanksRepository.balances([piggyId])).get(piggyId) ?? 0;
}

/** A piggy bank locked until maturity cannot be withdrawn from before that day. */
function assertRedeemable(piggy: PiggyBankRecord, today: Date): void {
  if (piggy.liquidity === "at_maturity" && piggy.maturityDate && piggy.maturityDate > today) {
    throw new ValidationError(
      `"${piggy.title}" can only be redeemed at maturity (${formatISODate(piggy.maturityDate)})`,
    );
  }
}

async function requireTransferAccount(
  context: HouseholdContext,
  accountId: string,
  parentAccountId: string,
  currencyCode: string,
) {
  if (accountId === parentAccountId) {
    throw new ValidationError(
      "Use the piggy bank's own account's free balance instead of a transfer",
    );
  }
  const account = await accountsRepository.get(accountId, context);
  if (!account) throw new NotFoundError("Account");
  assertNotArchived(account);
  if (account.type === "credit_card" || account.classification !== "asset") {
    throw new ValidationError("Transfers to and from piggy banks need an asset account");
  }
  if (account.currencyId !== currencyCode) {
    throw new ValidationError(`The account is not in ${currencyCode}`);
  }
  return account;
}

async function transfer(
  context: HouseholdContext,
  input: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    date: Date;
    description: string;
    notes?: string | null;
  },
): Promise<string> {
  const created = await transactionsService.createTransaction(context, {
    type: "transfer",
    description: input.description,
    notes: input.notes ?? undefined,
    purchaseDate: input.date,
    postedDate: input.date,
    fromAccountId: input.fromAccountId,
    toAccountId: input.toAccountId,
    fromAmount: input.amount,
    toAmount: input.amount,
  });
  return created.id;
}

/** Undo a transfer when the movement rows could not be written (the two are not one DB transaction). */
async function undoTransfer(context: HouseholdContext, transactionId: string | null) {
  if (!transactionId) return;
  try {
    await transactionsService.deleteTransaction(context, transactionId);
  } catch (error) {
    logger.error({ error, transactionId }, "[piggy-banks] Could not undo a transfer");
  }
}

async function operation(
  context: HouseholdContext,
  piggyBankIds: readonly string[],
  extra: { transactionId?: string | null; adjustment?: number | null } = {},
): Promise<PiggyBankOperation> {
  const piggyBanks = [];
  for (const id of piggyBankIds) piggyBanks.push(await presentDetail(context, id));
  return {
    piggyBanks,
    transactionId: extra.transactionId ?? null,
    adjustment: extra.adjustment ?? null,
  };
}

async function assertFree(context: HouseholdContext, accountId: string, amount: number) {
  const { free } = await freeBalanceOf(accountId, context);
  if (amount > free) {
    throw new ValidationError(
      "Not enough free balance in the account. Deposit from another account instead.",
    );
  }
}

// ─── Deposit ─────────────────────────────────────────────────────────────

export async function depositToPiggyBank(
  context: HouseholdContext,
  id: string,
  body: DepositToPiggyBankInput,
): Promise<PiggyBankOperation> {
  return bulkDeposit(context, {
    fromAccountId: body.fromAccountId ?? null,
    date: body.date,
    note: body.note,
    allocations: [{ piggyBankId: id, amount: body.amount }],
  });
}

/** One transfer (or the free balance) split across piggy banks of the same account. */
export async function bulkDeposit(
  context: HouseholdContext,
  body: BulkDepositInput,
): Promise<PiggyBankOperation> {
  const ids = body.allocations.map((allocation) => allocation.piggyBankId);
  if (new Set(ids).size !== ids.length) {
    throw new ValidationError("Each piggy bank can appear once in a split");
  }
  const piggies: PiggyBankRecord[] = [];
  for (const id of ids) piggies.push(await requirePiggyBank(context, id));
  for (const piggy of piggies) await assertOpen(piggy);
  const parentId = (piggies[0] as PiggyBankRecord).parentAccountId;
  if (piggies.some((piggy) => piggy.parentAccountId !== parentId)) {
    throw new ValidationError("A split can only go to piggy banks of the same account");
  }
  const parent = await requireParentAccount(context, parentId);
  assertNotArchived(parent);

  const total = body.allocations.reduce((sum, allocation) => sum + allocation.amount, 0);
  const date = dayOrToday(context, body.date);
  let transactionId: string | null = null;

  if (body.fromAccountId) {
    const from = await requireTransferAccount(
      context,
      body.fromAccountId,
      parent.id,
      parent.currencyId,
    );
    const titles = piggies.map((piggy) => piggy.title).join(", ");
    transactionId = await transfer(context, {
      fromAccountId: from.id,
      toAccountId: parent.id,
      amount: total,
      date,
      description: piggies.length === 1 ? `Deposit to ${titles}` : `Deposit split: ${titles}`,
      notes: body.note,
    });
  } else {
    await assertFree(context, parent.id, total);
  }

  const groupId = randomUUID();
  try {
    await piggyBanksRepository.insertMovements(
      db,
      body.allocations.map((allocation) => ({
        piggyBankId: allocation.piggyBankId,
        kind: "deposit",
        amount: allocation.amount,
        occurredOn: date,
        transactionId,
        groupId: body.allocations.length > 1 ? groupId : null,
        note: body.note ?? null,
        createdByUserId: context.userId,
      })),
    );
  } catch (error) {
    await undoTransfer(context, transactionId);
    throw error;
  }
  return operation(context, ids, { transactionId });
}

// ─── Withdraw ────────────────────────────────────────────────────────────

export async function withdrawFromPiggyBank(
  context: HouseholdContext,
  id: string,
  body: WithdrawFromPiggyBankInput,
): Promise<PiggyBankOperation> {
  const piggy = await requirePiggyBank(context, id);
  await assertOpen(piggy);
  const parent = await requireParentAccount(context, piggy.parentAccountId);
  const date = dayOrToday(context, body.date);
  assertRedeemable(piggy, getTodayInTimezone(context.timezone));
  if (body.amount > (await balanceOf(id))) {
    throw new ValidationError("The piggy bank holds less than that");
  }

  let transactionId: string | null = null;
  if (body.toAccountId) {
    assertNotArchived(parent);
    const to = await requireTransferAccount(
      context,
      body.toAccountId,
      parent.id,
      parent.currencyId,
    );
    transactionId = await transfer(context, {
      fromAccountId: parent.id,
      toAccountId: to.id,
      amount: body.amount,
      date,
      description: `Withdrawal from ${piggy.title}`,
      notes: body.note,
    });
  }
  try {
    await piggyBanksRepository.insertMovements(db, [
      {
        piggyBankId: id,
        kind: "withdrawal",
        amount: -body.amount,
        occurredOn: date,
        transactionId,
        note: body.note ?? null,
        createdByUserId: context.userId,
      },
    ]);
  } catch (error) {
    await undoTransfer(context, transactionId);
    throw error;
  }
  return operation(context, [id], { transactionId });
}

// ─── Move between piggy banks ────────────────────────────────────────────

export async function movePiggyBankFunds(
  context: HouseholdContext,
  body: MovePiggyBankFundsInput,
): Promise<PiggyBankOperation> {
  const from = await requirePiggyBank(context, body.fromPiggyBankId);
  const to = await requirePiggyBank(context, body.toPiggyBankId);
  await assertOpen(from);
  await assertOpen(to);
  if (from.parentAccountId !== to.parentAccountId) {
    throw new ValidationError("Piggy banks of different accounts cannot move money directly");
  }
  assertRedeemable(from, getTodayInTimezone(context.timezone));
  if (body.amount > (await balanceOf(from.id))) {
    throw new ValidationError(`"${from.title}" holds less than that`);
  }
  const date = dayOrToday(context, body.date);
  const groupId = randomUUID();
  await piggyBanksRepository.insertMovements(db, [
    {
      piggyBankId: from.id,
      kind: "transfer_out",
      amount: -body.amount,
      occurredOn: date,
      groupId,
      counterpartPiggyBankId: to.id,
      note: body.note ?? null,
      createdByUserId: context.userId,
    },
    {
      piggyBankId: to.id,
      kind: "transfer_in",
      amount: body.amount,
      occurredOn: date,
      groupId,
      counterpartPiggyBankId: from.id,
      note: body.note ?? null,
      createdByUserId: context.userId,
    },
  ]);
  return operation(context, [from.id, to.id]);
}

/**
 * An `adjustment` transaction for a known delta. The account flow's helper takes a target balance
 * "as of" the posted date, which would ignore same-day transactions; a piggy bank knows the delta.
 */
async function postAdjustment(
  tx: TxClient,
  context: HouseholdContext,
  input: {
    accountLedgerId: string;
    currencyCode: string;
    amount: number;
    description: string;
    notes?: string;
    date: Date;
  },
): Promise<string> {
  const adjustmentLedger = await ledgerAccountsRepository.findOrCreateSystem(
    tx,
    `system:adjustment:${input.currencyCode}`,
    SYSTEM_LEDGER_CLASSIFICATIONS.adjustment,
    input.currencyCode,
  );
  const transaction = await txRepository.createTransaction(tx, {
    householdId: context.householdId,
    createdByUserId: context.userId,
    type: "adjustment",
    description: input.description,
    notes: input.notes ?? null,
    includeInBudget: false,
    purchaseDate: input.date,
    postedDate: input.date,
  });
  await entriesService.createTransactionEntries(tx, transaction.id, [
    {
      ledgerAccountId: input.accountLedgerId,
      amount: input.amount,
      currencyCode: input.currencyCode,
    },
    {
      ledgerAccountId: adjustmentLedger.id,
      amount: -input.amount,
      currencyCode: input.currencyCode,
    },
  ]);
  return transaction.id;
}

// ─── Real balance ────────────────────────────────────────────────────────

/**
 * The bank shows `balance`: the difference to what we computed becomes an adjustment on the
 * parent account (and on the piggy bank), earlier estimated interest is confirmed and the
 * fractional carry resets, so accrual restarts from the real figure.
 */
export async function setPiggyBankBalance(
  context: HouseholdContext,
  id: string,
  body: SetPiggyBankBalanceInput,
): Promise<PiggyBankOperation> {
  const piggy = await requirePiggyBank(context, id);
  await assertOpen(piggy);
  const parent = await requireParentAccount(context, piggy.parentAccountId);
  assertNotArchived(parent);
  const date = dayOrToday(context, body.date);
  const current = await balanceOf(id);
  const delta = body.balance - current;

  let transactionId: string | null = null;
  await db.transaction(async (tx) => {
    if (delta !== 0) {
      const ledger = await ledgerAccountsRepository.findByOwner("account", parent.id);
      if (!ledger) throw new NotFoundError("Account ledger");
      transactionId = await postAdjustment(tx, context, {
        accountLedgerId: ledger.id,
        currencyCode: parent.currencyId,
        amount: delta,
        description: `Balance adjustment: ${piggy.title}`,
        notes: body.note ?? undefined,
        date,
      });
      await piggyBanksRepository.insertMovements(tx, [
        {
          piggyBankId: id,
          kind: "adjustment",
          amount: delta,
          occurredOn: date,
          transactionId,
          note: body.note ?? null,
          createdByUserId: context.userId,
        },
      ]);
    }
    await piggyBanksRepository.confirmEstimatedInterest(tx, id, date);
    if (piggy.accruedThrough) await piggyBanksRepository.resetCarry(tx, id, piggy.accruedThrough);
  });
  return operation(context, [id], { transactionId, adjustment: delta });
}
