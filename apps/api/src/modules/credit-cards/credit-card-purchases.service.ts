import { creditCardBillingCyclesTable } from "@luraba/db/schemas/credit-card-billing-cycles.schema";
import { creditCardBudgetRecognitionsTable } from "@luraba/db/schemas/credit-card-budget-recognitions.schema";
import { creditCardInstallmentsTable } from "@luraba/db/schemas/credit-card-installments.schema";
import { creditCardPurchasesTable } from "@luraba/db/schemas/credit-card-purchases.schema";
import { transactionsTable } from "@luraba/db/schemas/transactions.schema";
import {
  formatISODate,
  getTodayInTimezone,
  type InstallmentPlan,
  resolveInstallmentPlan,
  splitInstallmentAmounts,
  startOfMonth,
} from "@luraba/domain";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";
import type { TxClient } from "@/db/types";
import { assertNotArchived } from "@/modules/accounts/accounts.guards";
import { resolveCreditBudgetSettings } from "@/modules/budgets/budgets.settings";
import { entriesRepository } from "@/modules/entries/entries.repository";
import * as entriesService from "@/modules/entries/entries.service";
import { ledgerAccountsRepository } from "@/modules/ledger-accounts/ledger-accounts.repository";
import {
  addTransactionTags,
  listTransactionTags,
  replaceTransactionTags,
  validateTagIds,
} from "@/modules/tags/tags-associations.service";
import {
  insertRefundInTransaction,
  remainingRefundable,
} from "@/modules/transactions/transactions.refunds.service";
import { getTransaction } from "@/modules/transactions/transactions.service";
import { NotFoundError, ValidationError } from "@/shared/errors";
import type {
  CreditExpenseTiming,
  CreditInstallmentBudgetMode,
} from "@/shared/validation/preferences";
import {
  createInstallmentsForPurchase,
  recreateBudgetRecognitionsForPurchase,
  syncCardCycles,
} from "./credit-card-cycles.service";
import * as creditCardsRepository from "./credit-cards.repository";
import {
  createUnderlyingExpenseTransaction,
  deleteUnderlyingTransactionInTransaction,
  ensureCardHasAvailableCredit,
  ensureExpenseCategory,
  ensureMerchant,
  resolveCreditCardPaymentMethod,
  updateUnderlyingTransaction,
} from "./credit-cards.shared";
import type {
  CancelCreditCardPurchaseDto,
  CreateCreditCardPurchaseDto,
  CreditCardPurchaseResponse,
  UpdateCreditCardInstallmentDto,
  UpdateCreditCardPurchaseDto,
} from "./credit-cards.types";

type PurchaseWithTransactionRow = {
  purchaseId: string;
  creditCardId: string;
  transactionId: string;
  description: string;
  originalDescription: string | null;
  notes: string | null;
  categoryId: string | null;
  merchantId: string | null;
  purchaseDate: Date;
  postedDate: Date;
  amount: number;
  installmentCount: number;
  includeInBudget: boolean;
  budgetExpenseTiming: CreditExpenseTiming;
  budgetInstallmentMode: CreditInstallmentBudgetMode;
  createdAt: Date;
};

async function loadPurchase(
  householdId: string,
  creditCardId: string,
  purchaseId: string,
): Promise<PurchaseWithTransactionRow> {
  const rows = await db
    .select({
      purchaseId: creditCardPurchasesTable.id,
      creditCardId: creditCardPurchasesTable.creditCardId,
      transactionId: creditCardPurchasesTable.transactionId,
      description: transactionsTable.description,
      originalDescription: transactionsTable.originalDescription,
      notes: transactionsTable.notes,
      categoryId: transactionsTable.categoryId,
      merchantId: transactionsTable.merchantId,
      purchaseDate: transactionsTable.purchaseDate,
      postedDate: transactionsTable.postedDate,
      amount: creditCardPurchasesTable.purchaseAmount,
      installmentCount: creditCardPurchasesTable.installmentCount,
      includeInBudget: creditCardPurchasesTable.includeInBudget,
      budgetExpenseTiming: creditCardPurchasesTable.budgetExpenseTiming,
      budgetInstallmentMode: creditCardPurchasesTable.budgetInstallmentMode,
      createdAt: creditCardPurchasesTable.createdAt,
    })
    .from(creditCardPurchasesTable)
    .innerJoin(transactionsTable, eq(transactionsTable.id, creditCardPurchasesTable.transactionId))
    .where(
      and(
        eq(creditCardPurchasesTable.id, purchaseId),
        eq(creditCardPurchasesTable.creditCardId, creditCardId),
        eq(transactionsTable.householdId, householdId),
      ),
    )
    .limit(1);

  const purchase = rows[0];
  if (!purchase) throw new NotFoundError("Credit card purchase");

  return {
    ...purchase,
  };
}

async function loadPurchaseInstallments(purchaseId: string) {
  return db
    .select({
      installmentId: creditCardInstallmentsTable.id,
      installmentNumber: creditCardInstallmentsTable.installmentNumber,
      amount: creditCardInstallmentsTable.amount,
      billingCycleId: creditCardInstallmentsTable.billingCycleId,
      closingDate: creditCardBillingCyclesTable.closingDate,
      dueDate: creditCardBillingCyclesTable.dueDate,
    })
    .from(creditCardInstallmentsTable)
    .innerJoin(
      creditCardBillingCyclesTable,
      eq(creditCardBillingCyclesTable.id, creditCardInstallmentsTable.billingCycleId),
    )
    .where(eq(creditCardInstallmentsTable.purchaseId, purchaseId))
    .orderBy(asc(creditCardInstallmentsTable.installmentNumber));
}

async function mapPurchaseResponse(
  purchase: PurchaseWithTransactionRow,
): Promise<CreditCardPurchaseResponse> {
  const installments = await loadPurchaseInstallments(purchase.purchaseId);
  const tags = await listTransactionTags(purchase.transactionId);

  return {
    purchaseId: purchase.purchaseId,
    creditCardId: purchase.creditCardId,
    transactionId: purchase.transactionId,
    description: purchase.description,
    originalDescription: purchase.originalDescription,
    notes: purchase.notes,
    categoryId: purchase.categoryId,
    merchantId: purchase.merchantId,
    purchaseDate: formatISODate(purchase.purchaseDate),
    postedDate: formatISODate(purchase.postedDate),
    amount: purchase.amount,
    installmentCount: purchase.installmentCount,
    tags,
    includeInBudget: purchase.includeInBudget,
    budgetExpenseTiming: purchase.budgetExpenseTiming,
    budgetInstallmentMode: purchase.budgetInstallmentMode,
    installments: installments.map((installment) => ({
      installmentId: installment.installmentId,
      installmentNumber: installment.installmentNumber,
      amount: installment.amount,
      billingCycleId: installment.billingCycleId,
      closingDate: formatISODate(installment.closingDate),
      dueDate: formatISODate(installment.dueDate),
    })),
    createdAt: purchase.createdAt,
  };
}

function requirePlan(plan: InstallmentPlan) {
  if (!plan.ok) throw new ValidationError(plan.error);
  return plan;
}

export async function createPurchase(
  context: HouseholdContext,
  creditCardId: string,
  dto: CreateCreditCardPurchaseDto,
): Promise<CreditCardPurchaseResponse> {
  const card = await creditCardsRepository.findByIdOrThrow(context.householdId, creditCardId);
  assertNotArchived(card, "Credit card");
  await ensureExpenseCategory(context, dto.categoryId);
  await ensureMerchant(context, dto.merchantId);
  const plan = requirePlan(
    resolveInstallmentPlan({
      amount: dto.amount,
      installmentCount: dto.installmentCount,
      installmentAmounts: dto.installmentAmounts,
      installmentAmount: dto.installmentAmount,
      roundingMode: dto.roundingMode,
    }),
  );
  const amount = plan.total;
  const installmentCount = plan.amounts.length;
  await ensureCardHasAvailableCredit(card, amount);
  const tagIds = await validateTagIds(context, dto.tagIds);

  const paymentMethod = await resolveCreditCardPaymentMethod(context, card.currencyCode);
  const postedDate = dto.postedDate ?? dto.purchaseDate;
  const budgetSettings = await resolveCreditBudgetSettings(context, startOfMonth(postedDate));

  const result = await db.transaction(async (tx) => {
    await syncCardCycles(tx, card, context.timezone);

    const transaction = await createUnderlyingExpenseTransaction(tx, {
      householdId: context.householdId,
      createdByUserId: context.userId,
      card,
      paymentMethodId: paymentMethod.id,
      description: dto.description,
      originalDescription: dto.originalDescription,
      notes: dto.notes,
      amount,
      categoryId: dto.categoryId ?? null,
      merchantId: dto.merchantId,
      purchaseDate: dto.purchaseDate,
      postedDate,
    });

    const [purchase] = await tx
      .insert(creditCardPurchasesTable)
      .values({
        creditCardId: card.id,
        transactionId: transaction.id,
        purchaseAmount: amount,
        installmentCount,
        includeInBudget: dto.includeInBudget,
        budgetExpenseTiming: budgetSettings.timing,
        budgetInstallmentMode: budgetSettings.mode,
      })
      .returning();

    const installments = await createInstallmentsForPurchase(
      tx,
      card,
      purchase.id,
      postedDate,
      amount,
      installmentCount,
      1,
      plan.amounts,
    );

    await addTransactionTags(tx, transaction.id, tagIds);

    if (dto.includeInBudget && dto.categoryId) {
      await recreateBudgetRecognitionsForPurchase(tx, purchase, {
        categoryId: dto.categoryId,
        currencyCode: card.currencyCode,
        purchaseDate: postedDate,
      });
    }

    const syncedCycles = await syncCardCycles(tx, card, context.timezone);
    const cyclesById = new Map(syncedCycles.map((cycle) => [cycle.id, cycle]));

    return {
      purchase,
      transaction,
      installments: installments.map((installment) => {
        const cycle = cyclesById.get(installment.billingCycleId);
        if (!cycle) throw new NotFoundError("Billing cycle");
        return {
          installmentId: installment.id,
          installmentNumber: installment.installmentNumber,
          amount: installment.amount,
          billingCycleId: installment.billingCycleId,
          closingDate: cycle.closingDate,
          dueDate: cycle.dueDate,
        };
      }),
    };
  });

  return {
    purchaseId: result.purchase.id,
    creditCardId,
    transactionId: result.transaction.id,
    description: dto.description,
    originalDescription: dto.originalDescription ?? null,
    notes: dto.notes ?? null,
    categoryId: dto.categoryId ?? null,
    merchantId: dto.merchantId ?? null,
    purchaseDate: formatISODate(dto.purchaseDate),
    postedDate: formatISODate(postedDate),
    amount,
    installmentCount,
    tags: await listTransactionTags(result.transaction.id),
    includeInBudget: dto.includeInBudget,
    budgetExpenseTiming: result.purchase.budgetExpenseTiming,
    budgetInstallmentMode: result.purchase.budgetInstallmentMode,
    installments: result.installments.map((installment) => ({
      ...installment,
      closingDate: formatISODate(installment.closingDate),
      dueDate: formatISODate(installment.dueDate),
    })),
    createdAt: result.purchase.createdAt,
  };
}

export async function getPurchase(
  context: HouseholdContext,
  creditCardId: string,
  purchaseId: string,
): Promise<CreditCardPurchaseResponse> {
  await creditCardsRepository.findByIdOrThrow(context.householdId, creditCardId);
  const purchase = await loadPurchase(context.householdId, creditCardId, purchaseId);
  return mapPurchaseResponse(purchase);
}

export async function updatePurchase(
  context: HouseholdContext,
  creditCardId: string,
  purchaseId: string,
  dto: UpdateCreditCardPurchaseDto,
): Promise<CreditCardPurchaseResponse> {
  const card = await creditCardsRepository.findByIdOrThrow(context.householdId, creditCardId);
  const existingPurchase = await loadPurchase(context.householdId, creditCardId, purchaseId);
  const existingInstallments = await loadPurchaseInstallments(purchaseId);

  const categoryId = dto.categoryId !== undefined ? dto.categoryId : existingPurchase.categoryId;
  const merchantId = dto.merchantId === undefined ? existingPurchase.merchantId : dto.merchantId;
  const description = dto.description ?? existingPurchase.description;
  const originalDescription =
    dto.originalDescription === undefined
      ? existingPurchase.originalDescription
      : dto.originalDescription;
  const notes = dto.notes === undefined ? existingPurchase.notes : dto.notes;
  const purchaseDate = dto.purchaseDate ?? existingPurchase.purchaseDate;
  const postedDate = dto.postedDate ?? existingPurchase.postedDate;
  const includeInBudget = dto.includeInBudget ?? existingPurchase.includeInBudget;
  const tagIds = dto.tagIds === undefined ? undefined : await validateTagIds(context, dto.tagIds);
  const postedDateChanged = postedDate.getTime() !== existingPurchase.postedDate.getTime();

  // Installments on an invoice that already closed stay as they are, unless the amounts are sent explicitly
  // or the posted date moves (then every installment is laid out again).
  const today = getTodayInTimezone(context.timezone);
  const billedCount = existingInstallments.filter(
    (installment) => installment.closingDate <= today,
  ).length;
  const finalAmounts = resolveUpdatedAmounts(dto, existingPurchase, existingInstallments, {
    billedCount: postedDateChanged ? 0 : billedCount,
  });
  const amount = finalAmounts.reduce((total, value) => total + value, 0);
  const installmentCount = finalAmounts.length;
  const keepThrough = postedDateChanged ? 0 : Math.min(billedCount, installmentCount);

  await ensureExpenseCategory(context, categoryId);
  await ensureMerchant(context, merchantId ?? undefined);
  if (amount > existingPurchase.amount) {
    await ensureCardHasAvailableCredit(card, amount - existingPurchase.amount);
  }

  await db.transaction(async (tx) => {
    await updateUnderlyingTransaction(tx, context.householdId, existingPurchase.transactionId, {
      description,
      originalDescription,
      notes,
      categoryId,
      merchantId,
      purchaseDate,
      postedDate,
    });

    await tx
      .update(creditCardPurchasesTable)
      .set({
        purchaseAmount: amount,
        installmentCount,
        includeInBudget,
      })
      .where(eq(creditCardPurchasesTable.id, purchaseId));

    await rewritePurchaseEntries(tx, card, { ...existingPurchase, categoryId }, amount);

    for (const installment of existingInstallments) {
      if (installment.installmentNumber > keepThrough) {
        await tx
          .delete(creditCardInstallmentsTable)
          .where(eq(creditCardInstallmentsTable.id, installment.installmentId));
      } else {
        const nextAmount = finalAmounts[installment.installmentNumber - 1];
        if (nextAmount !== undefined && nextAmount !== installment.amount) {
          await tx
            .update(creditCardInstallmentsTable)
            .set({ amount: nextAmount })
            .where(eq(creditCardInstallmentsTable.id, installment.installmentId));
        }
      }
    }

    await tx
      .delete(creditCardBudgetRecognitionsTable)
      .where(eq(creditCardBudgetRecognitionsTable.purchaseId, purchaseId));

    if (keepThrough < installmentCount) {
      await createInstallmentsForPurchase(
        tx,
        card,
        purchaseId,
        postedDate,
        amount,
        installmentCount,
        keepThrough + 1,
        finalAmounts,
      );
    }

    if (includeInBudget && categoryId) {
      await recreateBudgetRecognitionsForPurchase(
        tx,
        {
          id: purchaseId,
          purchaseAmount: amount,
          installmentCount,
          budgetExpenseTiming: existingPurchase.budgetExpenseTiming,
          budgetInstallmentMode: existingPurchase.budgetInstallmentMode,
        },
        {
          categoryId,
          currencyCode: card.currencyCode,
          purchaseDate,
        },
      );
    }

    if (tagIds !== undefined) {
      await replaceTransactionTags(tx, existingPurchase.transactionId, tagIds);
    }

    await syncCardCycles(tx, card, context.timezone);
  });

  return getPurchase(context, creditCardId, purchaseId);
}

/**
 * The final list of installment amounts after an update. Nothing about the amounts sent: the current ones stay.
 * An exact list (`installmentAmounts` / `installmentAmount`) replaces all of them. Otherwise the total (sent or
 * current) is split by `roundingMode`, but the installments already billed keep their amounts and only the rest
 * is split.
 */
function resolveUpdatedAmounts(
  dto: UpdateCreditCardPurchaseDto,
  purchase: PurchaseWithTransactionRow,
  installments: Awaited<ReturnType<typeof loadPurchaseInstallments>>,
  { billedCount }: { billedCount: number },
): number[] {
  const current = installments.map((installment) => installment.amount);
  const hasExact = dto.installmentAmounts !== undefined || dto.installmentAmount !== undefined;
  const touchesPlan =
    hasExact ||
    dto.amount !== undefined ||
    dto.installmentCount !== undefined ||
    dto.roundingMode !== undefined;
  if (!touchesPlan) return current.length > 0 ? current : [purchase.amount];

  const plan = requirePlan(
    resolveInstallmentPlan(
      {
        amount: hasExact ? dto.amount : (dto.amount ?? purchase.amount),
        installmentCount: dto.installmentCount,
        installmentAmounts: dto.installmentAmounts,
        installmentAmount: dto.installmentAmount,
        roundingMode: dto.roundingMode,
      },
      purchase.installmentCount,
    ),
  );
  if (hasExact || billedCount === 0) return plan.amounts;

  if (plan.amounts.length <= billedCount) {
    throw new ValidationError(
      `${billedCount} installments are already on closed invoices; the purchase needs more than that many installments`,
    );
  }
  const billed = current.slice(0, billedCount);
  const remaining = plan.total - billed.reduce((total, value) => total + value, 0);
  if (remaining <= 0) {
    throw new ValidationError("The amount is not enough to cover the installments already billed");
  }
  return [
    ...billed,
    ...splitInstallmentAmounts(
      remaining,
      plan.amounts.length - billedCount,
      dto.roundingMode ?? "remainder_last",
    ),
  ];
}

/**
 * Edits one installment: its amount (the purchase total, the card's used limit, the invoice and the reports follow)
 * and/or the invoice it lands on.
 */
export async function updateInstallment(
  context: HouseholdContext,
  creditCardId: string,
  purchaseId: string,
  installmentId: string,
  dto: UpdateCreditCardInstallmentDto,
): Promise<CreditCardPurchaseResponse> {
  const card = await creditCardsRepository.findByIdOrThrow(context.householdId, creditCardId);
  const purchase = await loadPurchase(context.householdId, creditCardId, purchaseId);
  const installments = await loadPurchaseInstallments(purchaseId);
  const installment = installments.find((item) => item.installmentId === installmentId);
  if (!installment) throw new NotFoundError("Installment");

  const nextAmount = dto.amount ?? installment.amount;
  const nextTotal = purchase.amount - installment.amount + nextAmount;
  if (nextTotal > purchase.amount) {
    await ensureCardHasAvailableCredit(card, nextTotal - purchase.amount);
  }
  if (dto.billingCycleId) {
    const cycle = await db
      .select({ id: creditCardBillingCyclesTable.id })
      .from(creditCardBillingCyclesTable)
      .where(
        and(
          eq(creditCardBillingCyclesTable.id, dto.billingCycleId),
          eq(creditCardBillingCyclesTable.creditCardId, card.id),
        ),
      )
      .limit(1);
    if (!cycle[0]) throw new NotFoundError("Billing cycle");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(creditCardInstallmentsTable)
      .set({
        amount: nextAmount,
        billingCycleId: dto.billingCycleId ?? installment.billingCycleId,
      })
      .where(eq(creditCardInstallmentsTable.id, installmentId));

    if (nextTotal !== purchase.amount) {
      await tx
        .update(creditCardPurchasesTable)
        .set({ purchaseAmount: nextTotal })
        .where(eq(creditCardPurchasesTable.id, purchaseId));
      await rewritePurchaseEntries(tx, card, purchase, nextTotal);
    }

    await tx
      .delete(creditCardBudgetRecognitionsTable)
      .where(eq(creditCardBudgetRecognitionsTable.purchaseId, purchaseId));
    if (purchase.includeInBudget && purchase.categoryId) {
      await recreateBudgetRecognitionsForPurchase(
        tx,
        {
          id: purchaseId,
          purchaseAmount: nextTotal,
          installmentCount: purchase.installmentCount,
          budgetExpenseTiming: purchase.budgetExpenseTiming,
          budgetInstallmentMode: purchase.budgetInstallmentMode,
        },
        {
          categoryId: purchase.categoryId,
          currencyCode: card.currencyCode,
          purchaseDate: purchase.postedDate,
        },
      );
    }

    await syncCardCycles(tx, card, context.timezone);
  });

  return getPurchase(context, creditCardId, purchaseId);
}

export async function deletePurchase(
  context: HouseholdContext,
  creditCardId: string,
  purchaseId: string,
): Promise<void> {
  const card = await creditCardsRepository.findByIdOrThrow(context.householdId, creditCardId);
  const existingPurchase = await loadPurchase(context.householdId, creditCardId, purchaseId);

  await db.transaction(async (tx) => {
    await deleteUnderlyingTransactionInTransaction(
      tx,
      context.householdId,
      existingPurchase.transactionId,
    );
    await syncCardCycles(tx, card, context.timezone);
  });
}

const CANCEL_DESCRIPTIONS = {
  cancellation: "Cancellation",
  chargeback: "Chargeback",
  refund: "Refund",
} as const;

/**
 * Cancels a card purchase by crediting the card. `single_credit` credits everything that is left in
 * one go. `cancel_future` first drops the installments that are not billed yet (the purchase shrinks
 * to what was billed, and the card's used limit shrinks with it), then credits the billed part.
 * Either way the credit lands on the invoice of the cancellation date.
 */
export async function cancelPurchase(
  context: HouseholdContext,
  creditCardId: string,
  purchaseId: string,
  dto: CancelCreditCardPurchaseDto,
) {
  const card = await creditCardsRepository.findByIdOrThrow(context.householdId, creditCardId);
  const purchase = await loadPurchase(context.householdId, creditCardId, purchaseId);
  const today = getTodayInTimezone(context.timezone);
  const date = dto.date ?? today;
  const installments = await loadPurchaseInstallments(purchaseId);

  const left = await remainingRefundable(context, purchase.transactionId);
  if (left <= 0) throw new ValidationError("This purchase has already been fully refunded");

  const future =
    dto.mode === "cancel_future"
      ? installments.filter((installment) => installment.closingDate > today)
      : [];
  const futureAmount = future.reduce((total, installment) => total + installment.amount, 0);
  const creditAmount = left - futureAmount;
  if (creditAmount <= 0) {
    throw new ValidationError(
      "Nothing has been billed yet, so there is nothing to credit; delete the purchase instead",
    );
  }

  const refundTransactionId = await db.transaction(async (tx) => {
    if (future.length > 0) {
      const nextAmount = purchase.amount - futureAmount;
      await tx.delete(creditCardInstallmentsTable).where(
        inArray(
          creditCardInstallmentsTable.id,
          future.map((installment) => installment.installmentId),
        ),
      );
      await tx
        .update(creditCardPurchasesTable)
        .set({ purchaseAmount: nextAmount, installmentCount: installments.length - future.length })
        .where(eq(creditCardPurchasesTable.id, purchaseId));
      await rewritePurchaseEntries(tx, card, purchase, nextAmount);
      await tx
        .delete(creditCardBudgetRecognitionsTable)
        .where(eq(creditCardBudgetRecognitionsTable.purchaseId, purchaseId));
      if (purchase.includeInBudget && purchase.categoryId) {
        await recreateBudgetRecognitionsForPurchase(
          tx,
          {
            id: purchaseId,
            purchaseAmount: nextAmount,
            installmentCount: installments.length - future.length,
            budgetExpenseTiming: purchase.budgetExpenseTiming,
            budgetInstallmentMode: purchase.budgetInstallmentMode,
          },
          {
            categoryId: purchase.categoryId,
            currencyCode: card.currencyCode,
            purchaseDate: purchase.postedDate,
          },
        );
      }
    }

    return insertRefundInTransaction(tx, context, {
      reason: dto.reason,
      description: dto.description ?? `${CANCEL_DESCRIPTIONS[dto.reason]}: ${purchase.description}`,
      originalDescription: dto.originalDescription,
      notes: dto.notes,
      amount: creditAmount,
      purchaseDate: date,
      postedDate: date,
      categoryId: purchase.categoryId,
      merchantId: purchase.merchantId,
      includeInBudget: purchase.includeInBudget,
      tagIds: [],
      originalTransactionId: purchase.transactionId,
      ledgerOwnerAccountId: card.ledgerAccountId,
      currencyCode: card.currencyCode,
      card,
    });
  });

  return {
    refund: await getTransaction(context, refundTransactionId),
    purchase: await getPurchase(context, creditCardId, purchaseId),
  };
}

async function rewritePurchaseEntries(
  tx: TxClient,
  card: Awaited<ReturnType<typeof creditCardsRepository.findByIdOrThrow>>,
  purchase: PurchaseWithTransactionRow,
  amount: number,
): Promise<void> {
  const accountLedger = await ledgerAccountsRepository.findByOwner("account", card.ledgerAccountId);
  if (!accountLedger) throw new NotFoundError("Credit card ledger");
  const expenseLedger = await ledgerAccountsRepository.findOrCreateSystem(
    tx,
    `system:expense:${card.currencyCode}`,
    "liability",
    card.currencyCode,
  );
  await entriesRepository.deleteByTransactionId(tx, purchase.transactionId);
  await entriesService.createTransactionEntries(tx, purchase.transactionId, [
    {
      ledgerAccountId: accountLedger.id,
      amount: -amount,
      currencyCode: card.currencyCode,
      categoryId: purchase.categoryId ?? undefined,
    },
    { ledgerAccountId: expenseLedger.id, amount, currencyCode: card.currencyCode },
  ]);
}
