import type { MoneyBackEntry, TransactionMoneyBack } from "@luraba/contracts";
import { creditCardPurchasesTable } from "@luraba/db/schemas/credit-card-purchases.schema";
import { startOfMonth as toBudgetMonth } from "@luraba/domain";
import { eq } from "drizzle-orm";
import type { HouseholdContext } from "@/config/permissions";
import { SYSTEM_LEDGER_CLASSIFICATIONS } from "@/config/transactions";
import { db } from "@/db";
import type { TxClient } from "@/db/types";
import { assertNotArchived } from "@/modules/accounts/accounts.guards";
import { accountsRepository } from "@/modules/accounts/accounts.repository";
import { categoriesRepository } from "@/modules/categories/categories.repository";
import {
  ensureCycleForDate,
  syncCardCycles,
} from "@/modules/credit-cards/credit-card-cycles.service";
import type { CreditCardRow } from "@/modules/credit-cards/credit-cards.helpers";
import * as creditCardsRepository from "@/modules/credit-cards/credit-cards.repository";
import * as entriesService from "@/modules/entries/entries.service";
import { ledgerAccountsRepository } from "@/modules/ledger-accounts/ledger-accounts.repository";
import { merchantsRepository } from "@/modules/merchants/merchants.repository";
import { addTransactionTags, validateTagIds } from "@/modules/tags/tags-associations.service";
import { NotFoundError, ValidationError } from "@/shared/errors";
import { mapDetailedRows } from "./transactions.helpers";
import * as refundsRepository from "./transactions.refunds.repository";
import * as txRepository from "./transactions.repository";
import type { CreateTransactionDto, TransactionResponse } from "./transactions.types";

type RefundDto = Extract<CreateTransactionDto, { type: "refund" }>;

export type RefundInput = {
  reason: RefundDto["reason"];
  description: string;
  originalDescription?: string | null;
  notes?: string | null;
  amount: number;
  purchaseDate: Date;
  postedDate: Date;
  categoryId: string | null;
  merchantId: string | null;
  includeInBudget: boolean;
  tagIds: string[];
  originalTransactionId: string | null;
  /** The ledger account that receives the money: a bank account, or the card's own ledger account. */
  ledgerOwnerAccountId: string;
  currencyCode: string;
  card: CreditCardRow | null;
};

type OriginalInfo = {
  transaction: TransactionResponse;
  /** The full amount of the original in minor units (a card purchase counts all installments). */
  amount: number;
  creditCardId: string | null;
  /** Card purchases keep the budget flag on the purchase; the underlying transaction is always off. */
  includeInBudget: boolean;
};

async function loadOriginal(
  context: HouseholdContext,
  originalTransactionId: string,
): Promise<OriginalInfo> {
  const rows = await txRepository.listDetailedByTransactionIds(context, [originalTransactionId]);
  const [transaction] = mapDetailedRows(rows);
  if (!transaction) throw new NotFoundError("Original transaction");
  if (transaction.type !== "expense") {
    throw new ValidationError("Money back can only be linked to an expense or a card purchase");
  }
  const [purchase] = await db
    .select({
      amount: creditCardPurchasesTable.purchaseAmount,
      creditCardId: creditCardPurchasesTable.creditCardId,
      includeInBudget: creditCardPurchasesTable.includeInBudget,
    })
    .from(creditCardPurchasesTable)
    .where(eq(creditCardPurchasesTable.transactionId, originalTransactionId));
  return {
    transaction,
    amount: purchase?.amount ?? transaction.amount,
    creditCardId: purchase?.creditCardId ?? null,
    includeInBudget: purchase?.includeInBudget ?? transaction.includeInBudget,
  };
}

/**
 * Rules for pointing money back at a purchase, whichever account or card the money lands on: the same
 * currency (no conversion, so the sums stay exact) and a total of linked rows that stays within the
 * original's full amount. `excludeTransactionId` leaves out the row being re-linked.
 */
async function assertCanLink(
  context: HouseholdContext,
  original: OriginalInfo,
  originalTransactionId: string,
  moneyBack: { amount: number; currencyCode: string },
  excludeTransactionId?: string,
): Promise<void> {
  if (original.transaction.currencyCode !== moneyBack.currencyCode) {
    throw new ValidationError(
      `The purchase is in ${original.transaction.currencyCode} but the money back is in ${moneyBack.currencyCode}; link rows in the same currency`,
    );
  }
  const refunded = await refundsRepository.sumRefundedAgainst(
    context.householdId,
    originalTransactionId,
    excludeTransactionId,
  );
  if (moneyBack.amount > original.amount - refunded) {
    throw new ValidationError(
      `Money back exceeds what is left on the original (${original.amount - refunded} minor units)`,
    );
  }
}

/** Reads the amount that can still come back against a transaction. */
export async function remainingRefundable(
  context: HouseholdContext,
  originalTransactionId: string,
): Promise<number> {
  const original = await loadOriginal(context, originalTransactionId);
  const refunded = await refundsRepository.sumRefundedAgainst(
    context.householdId,
    originalTransactionId,
  );
  return original.amount - refunded;
}

async function validateExpenseCategory(context: HouseholdContext, categoryId: string | null) {
  if (!categoryId) return;
  const category = await categoriesRepository.get(categoryId, context);
  if (!category) throw new NotFoundError("Category");
  if (category.type !== "expense") {
    throw new ValidationError(`Category ${categoryId} must be an expense category`);
  }
}

/**
 * Writes the refund inside the caller's database transaction: the transaction row, its ledger
 * entries (the target gets the money, the expense ledger gives it back), the detail row and, for a
 * card, the invoice the credit lands on.
 */
export async function insertRefundInTransaction(
  tx: TxClient,
  context: HouseholdContext,
  input: RefundInput,
): Promise<string> {
  const targetLedger = await ledgerAccountsRepository.findByOwner(
    "account",
    input.ledgerOwnerAccountId,
  );
  if (!targetLedger) throw new NotFoundError("Account ledger");
  const expenseLedger = await ledgerAccountsRepository.findOrCreateSystem(
    tx,
    `system:expense:${input.currencyCode}`,
    SYSTEM_LEDGER_CLASSIFICATIONS.expense,
    input.currencyCode,
  );

  let billingCycleId: string | null = null;
  if (input.card) {
    await syncCardCycles(tx, input.card, context.timezone);
    billingCycleId = (await ensureCycleForDate(tx, input.card, input.postedDate)).id;
  }

  const transaction = await txRepository.createTransaction(tx, {
    householdId: context.householdId,
    createdByUserId: context.userId,
    type: "refund",
    paymentMethodId: null,
    categoryId: input.categoryId,
    description: input.description,
    originalDescription: input.originalDescription ?? null,
    notes: input.notes ?? null,
    includeInBudget: input.includeInBudget,
    merchantId: input.merchantId,
    purchaseDate: input.purchaseDate,
    postedDate: input.postedDate,
  });

  await entriesService.createTransactionEntries(tx, transaction.id, [
    {
      ledgerAccountId: targetLedger.id,
      amount: input.amount,
      currencyCode: input.currencyCode,
      categoryId: input.categoryId ?? undefined,
      budgetMonth: toBudgetMonth(input.postedDate),
    },
    {
      ledgerAccountId: expenseLedger.id,
      amount: -input.amount,
      currencyCode: input.currencyCode,
    },
  ]);

  await refundsRepository.insertRefund(tx, {
    transactionId: transaction.id,
    reason: input.reason,
    originalTransactionId: input.originalTransactionId,
    creditCardId: input.card?.id ?? null,
    billingCycleId,
  });
  await addTransactionTags(tx, transaction.id, input.tagIds);

  if (input.card) await syncCardCycles(tx, input.card, context.timezone);
  return transaction.id;
}

/** Validates a `type: "refund"` request and records it. Returns the new transaction id. */
export async function createRefund(context: HouseholdContext, dto: RefundDto): Promise<string> {
  const original = dto.originalTransactionId
    ? await loadOriginal(context, dto.originalTransactionId)
    : null;

  let card: CreditCardRow | null = null;
  let ledgerOwnerAccountId: string;
  let currencyCode: string;
  if (dto.creditCardId) {
    card = await creditCardsRepository.findByIdOrThrow(context.householdId, dto.creditCardId);
    assertNotArchived(card, "Credit card");
    ledgerOwnerAccountId = card.ledgerAccountId;
    currencyCode = card.currencyCode;
  } else {
    const account = await accountsRepository.get(dto.accountId as string, context);
    if (!account) throw new NotFoundError("Account");
    assertNotArchived(account);
    if (account.type === "credit_card") {
      throw new ValidationError("Refunds to a credit card must use creditCardId");
    }
    ledgerOwnerAccountId = account.id;
    currencyCode = account.currencyId;
  }
  if (dto.currencyCode && dto.currencyCode !== currencyCode) {
    throw new ValidationError("Refund currency must match the account or card currency");
  }

  if (original) {
    await assertCanLink(context, original, dto.originalTransactionId as string, {
      amount: dto.amount,
      currencyCode,
    });
  }

  const categoryId =
    dto.categoryId === undefined ? (original?.transaction.categoryId ?? null) : dto.categoryId;
  await validateExpenseCategory(context, categoryId);
  const merchantId = dto.merchantId ?? original?.transaction.merchantId ?? null;
  if (dto.merchantId) {
    if (!(await merchantsRepository.get(dto.merchantId, context))) {
      throw new NotFoundError("Merchant");
    }
  }
  const tagIds = await validateTagIds(context, dto.tagIds);

  return db.transaction((tx) =>
    insertRefundInTransaction(tx, context, {
      reason: dto.reason,
      description: dto.description,
      originalDescription: dto.originalDescription,
      notes: dto.notes,
      amount: dto.amount,
      purchaseDate: dto.purchaseDate,
      postedDate: dto.postedDate,
      categoryId,
      merchantId,
      includeInBudget: dto.includeInBudget ?? original?.includeInBudget ?? true,
      tagIds,
      originalTransactionId: dto.originalTransactionId ?? null,
      ledgerOwnerAccountId,
      currencyCode,
      card,
    }),
  );
}

/** Attaches the refund detail (reason, link, invoice) to transactions of type `refund`. */
export async function attachRefundDetails<T extends TransactionResponse>(
  transactions: T[],
): Promise<T[]> {
  const ids = transactions.filter((item) => item.type === "refund").map((item) => item.id);
  if (ids.length === 0) return transactions;
  const details = new Map(
    (await refundsRepository.listByTransactionIds(ids)).map((row) => [row.transactionId, row]),
  );
  return transactions.map((item) => {
    const detail = details.get(item.id);
    return detail
      ? {
          ...item,
          refund: {
            reason: detail.reason,
            originalTransactionId: detail.originalTransactionId,
            creditCardId: detail.creditCardId,
            billingCycleId: detail.billingCycleId,
          },
        }
      : item;
  });
}

export function listRefundDetails(transactionIds: string[]) {
  return refundsRepository.listByTransactionIds(transactionIds);
}

/**
 * Links an existing money-back row to a purchase (or unlinks it with `null`). Only the link changes:
 * the row keeps its own account or card, category, date and ledger entries, so balances, invoices and the
 * card's used limit stay as they were; only the net cost of the purchase moves.
 */
export async function setRefundLink(
  context: HouseholdContext,
  refundTransactionId: string,
  originalTransactionId: string | null,
): Promise<void> {
  const rows = await txRepository.listDetailedByTransactionIds(context, [refundTransactionId]);
  const [transaction] = mapDetailedRows(rows);
  if (!transaction) throw new NotFoundError("Transaction");
  const [detail] = await refundsRepository.listByTransactionIds([refundTransactionId]);
  if (transaction.type !== "refund" || !detail) {
    throw new ValidationError(
      "Only a refund, cancellation, chargeback, cashback or split can be linked",
    );
  }
  if (originalTransactionId) {
    if (originalTransactionId === refundTransactionId) {
      throw new ValidationError("A transaction cannot be linked to itself");
    }
    const original = await loadOriginal(context, originalTransactionId);
    await assertCanLink(
      context,
      original,
      originalTransactionId,
      { amount: transaction.amount, currencyCode: transaction.currencyCode },
      refundTransactionId,
    );
  }
  await db.transaction((tx) =>
    refundsRepository.setOriginalTransactionId(tx, refundTransactionId, originalTransactionId),
  );
}

type MoneyBackCandidate = {
  id: string;
  type: string;
  amount: number;
  currencyCode: string;
  moneyBack?: TransactionMoneyBack | null;
};

/**
 * Adds the net cost (`moneyBack`) to expenses and card purchases: the full purchase, the sum of the
 * linked money-back rows (each with where it landed) and what is left out of pocket. A card purchase
 * counts its full amount across installments. Every other row is returned untouched.
 */
export async function attachMoneyBack<T extends MoneyBackCandidate>(
  context: HouseholdContext,
  rows: T[],
): Promise<T[]> {
  const ids = [...new Set(rows.filter((row) => row.type === "expense").map((row) => row.id))];
  if (ids.length === 0) return rows;
  const [links, totals] = await Promise.all([
    refundsRepository.listLinkedToOriginals(context.householdId, ids),
    refundsRepository.listPurchaseTotals(ids),
  ]);
  const moneyBackRows = links.length
    ? mapDetailedRows(
        await txRepository.listDetailedByTransactionIds(
          context,
          links.map((link) => link.transactionId),
        ),
      )
    : [];
  const byId = new Map(moneyBackRows.map((row) => [row.id, row]));
  const entriesByOriginal = new Map<string, MoneyBackEntry[]>();
  for (const link of links) {
    const row = byId.get(link.transactionId);
    if (!row) continue;
    const list = entriesByOriginal.get(link.originalTransactionId) ?? [];
    list.push({
      transactionId: row.id,
      reason: link.reason,
      description: row.description,
      amount: row.amount,
      currencyCode: row.currencyCode,
      postedDate: row.postedDate,
      accountId: row.accountId,
      accountName: row.accountName,
      accountClassification: row.accountClassification,
      creditCardId: link.creditCardId,
    });
    entriesByOriginal.set(link.originalTransactionId, list);
  }
  return rows.map((row) => {
    if (row.type !== "expense") return row;
    const entries = (entriesByOriginal.get(row.id) ?? []).sort(
      (a, b) =>
        a.postedDate.localeCompare(b.postedDate) || a.transactionId.localeCompare(b.transactionId),
    );
    const totalAmount = totals.get(row.id) ?? row.amount;
    const receivedBack = entries.reduce((sum, entry) => sum + entry.amount, 0);
    return {
      ...row,
      moneyBack: { totalAmount, receivedBack, outOfPocket: totalAmount - receivedBack, entries },
    };
  });
}
