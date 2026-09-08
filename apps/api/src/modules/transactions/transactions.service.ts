import { parseISODate, startOfMonth as toBudgetMonth } from "@luraba/domain";
import type { HouseholdContext } from "@/config/permissions";
import { SYSTEM_LEDGER_CLASSIFICATIONS } from "@/config/transactions";
import { db } from "@/db";
import type { TxClient } from "@/db/types";
import { accountsRepository } from "@/modules/accounts/accounts.repository";
import type { AccountRecord } from "@/modules/accounts/accounts.types";
import { categoriesRepository } from "@/modules/categories/categories.repository";
import { currenciesRepository } from "@/modules/currencies/currencies.repository";
import { entriesRepository } from "@/modules/entries/entries.repository";
import * as entriesService from "@/modules/entries/entries.service";
import type { EntryDraft } from "@/modules/entries/entries.types";
import { fxService } from "@/modules/fx/fx.service";
import { ledgerAccountsRepository } from "@/modules/ledger-accounts/ledger-accounts.repository";
import { merchantsRepository } from "@/modules/merchants/merchants.repository";
import { paymentMethodsRepository } from "@/modules/payment-methods/payment-methods.repository";
import {
  addTransactionTags,
  replaceTransactionTags,
  validateTagIds,
} from "@/modules/tags/tags-associations.service";
import { NotFoundError, ValidationError } from "@/shared/errors";
import { createListMeta, type ListResult } from "@/shared/list";
import {
  mapCreditCardInstallmentRowsToFeedRows,
  mapDetailedRows,
  mapTransactionResponsesToFeedRows,
  resolveTransferAmounts,
  toRawLedgerBalance,
} from "./transactions.helpers";
import type { ListTransactionsQuery } from "./transactions.query";
import * as txRepository from "./transactions.repository";
import type {
  CreateTransactionDto,
  TransactionFeedRow,
  TransactionResponse,
  UpdateTransactionValues,
} from "./transactions.types";

// -----------------------------------------------------------------------------
// Scoped Validation + Lookups
// -----------------------------------------------------------------------------

async function validateOptionalMerchant(
  context: HouseholdContext,
  merchantId?: string | null,
): Promise<void> {
  if (!merchantId) return;

  const merchant = await merchantsRepository.get(merchantId, context);
  if (!merchant) throw new NotFoundError("Merchant");
}

async function validateCategory(
  context: HouseholdContext,
  categoryId: string | null | undefined,
  expectedType: "expense" | "income",
): Promise<void> {
  if (!categoryId) return;
  const category = await categoriesRepository.get(categoryId, context);
  if (!category) throw new NotFoundError("Category");
  if (category.type !== expectedType) {
    throw new ValidationError(`Category ${categoryId} must be of type ${expectedType}`);
  }
}

async function resolvePaymentMethod(
  context: HouseholdContext,
  paymentMethodCode: string,
  currencyCode: string,
) {
  if (paymentMethodCode === "credit_card") {
    throw new ValidationError(
      "Credit card payments must use the dedicated credit card purchase endpoint",
    );
  }

  const paymentMethod = await paymentMethodsRepository.findAvailableByCode(
    context,
    paymentMethodCode,
    currencyCode,
  );
  if (!paymentMethod) {
    throw new ValidationError(
      `Payment method ${paymentMethodCode} is not available for currency ${currencyCode}`,
    );
  }

  return paymentMethod;
}

// -----------------------------------------------------------------------------
// Transaction Persistence Helpers
// -----------------------------------------------------------------------------

async function createBaseTransaction(
  tx: TxClient,
  context: HouseholdContext,
  values: {
    type: CreateTransactionDto["type"];
    paymentMethodId?: string | null;
    categoryId?: string | null;
    description: string;
    purchaseDate: Date;
    postedDate: Date;
    includeInBudget: boolean;
    merchantId?: string;
  },
): Promise<string> {
  const transaction = await txRepository.createTransaction(tx, {
    householdId: context.householdId,
    type: values.type,
    paymentMethodId: values.paymentMethodId ?? null,
    categoryId: values.categoryId ?? null,
    description: values.description,
    includeInBudget: values.includeInBudget,
    merchantId: values.merchantId,
    purchaseDate: values.purchaseDate,
    postedDate: values.postedDate,
  });

  return transaction.id;
}

async function loadCreatedTransaction(
  context: HouseholdContext,
  transactionId: string,
): Promise<TransactionResponse> {
  const rows = await txRepository.listDetailedByTransactionIds(context, [transactionId]);
  const [transaction] = mapDetailedRows(rows);

  if (!transaction) {
    throw new NotFoundError("Transaction");
  }

  return transaction;
}

// -----------------------------------------------------------------------------
// Create Transaction Flows
// -----------------------------------------------------------------------------

async function createExpenseOrIncome(
  context: HouseholdContext,
  dto: Extract<CreateTransactionDto, { type: "expense" | "income" }>,
): Promise<TransactionResponse> {
  const currency = await currenciesRepository.findByCode(dto.currencyCode);
  if (!currency) throw new NotFoundError("Currency");

  const paymentMethod = await resolvePaymentMethod(
    context,
    dto.paymentMethodCode,
    dto.currencyCode,
  );

  await validateOptionalMerchant(context, dto.merchantId);
  await validateCategory(context, dto.categoryId, dto.type);
  const tagIds = await validateTagIds(context, dto.tagIds);

  const account = await accountsRepository.get(dto.accountId, context);
  if (!account) throw new NotFoundError("Account");
  if (account.type === "credit_card") {
    throw new ValidationError(
      dto.type === "expense"
        ? "Direct expense creation for credit card accounts must use the credit card purchase endpoint"
        : "Direct income creation for credit card accounts must use the credit card purchase/payment APIs",
    );
  }
  if (account.currencyId !== dto.currencyCode) {
    throw new ValidationError("Transaction currency must match account currency");
  }

  const transactionId = await db.transaction(async (tx) => {
    const createdTransactionId = await createBaseTransaction(tx, context, {
      type: dto.type,
      paymentMethodId: paymentMethod.id,
      categoryId: dto.categoryId,
      description: dto.description,
      purchaseDate: dto.purchaseDate,
      postedDate: dto.postedDate,
      merchantId: dto.merchantId,
      includeInBudget: dto.includeInBudget ?? true,
    });

    await createExpenseOrIncomeEntries(tx, {
      transactionId: createdTransactionId,
      type: dto.type,
      accountId: account.id,
      amount: dto.amount,
      currencyCode: dto.currencyCode,
      categoryId: dto.categoryId ?? null,
      postedDate: dto.postedDate,
    });
    await addTransactionTags(tx, createdTransactionId, tagIds);

    return createdTransactionId;
  });

  return loadCreatedTransaction(context, transactionId);
}

// Transfer: same-currency transfers use two account entries. Cross-currency
// transfers add two offshore clearing entries so each currency balances by
// itself while still allowing manual or FX-derived destination amounts.
async function createTransfer(
  context: HouseholdContext,
  dto: Extract<CreateTransactionDto, { type: "transfer" }>,
): Promise<TransactionResponse> {
  if (dto.fromAccountId === dto.toAccountId) {
    throw new ValidationError("Transfer source and destination must be different accounts");
  }

  const fromAccount = await accountsRepository.get(dto.fromAccountId, context);
  if (!fromAccount) throw new NotFoundError("Source account");
  if (fromAccount.type === "credit_card") {
    throw new ValidationError(
      "Direct transfers from credit card accounts must use the credit card payment endpoint",
    );
  }

  const toAccount = await accountsRepository.get(dto.toAccountId, context);
  if (!toAccount) throw new NotFoundError("Destination account");
  if (toAccount.type === "credit_card") {
    throw new ValidationError(
      "Direct transfers to credit card accounts must use the credit card payment endpoint",
    );
  }

  const tagIds = await validateTagIds(context, dto.tagIds);

  const { fromAmount, toAmount } = await resolveTransferAmounts({
    fromCurrencyCode: fromAccount.currencyId,
    toCurrencyCode: toAccount.currencyId,
    fromAmount: dto.fromAmount,
    toAmount: dto.toAmount,
    postedDate: dto.postedDate,
    convertAmount: (input) => fxService.convertAmount(input),
  });

  const transactionId = await db.transaction(async (tx) => {
    const createdTransactionId = await createBaseTransaction(tx, context, {
      type: dto.type,
      description: dto.description,
      purchaseDate: dto.purchaseDate,
      postedDate: dto.postedDate,
      includeInBudget: dto.includeInBudget ?? true,
    });

    await createTransferEntries(tx, {
      transactionId: createdTransactionId,
      fromAccountId: fromAccount.id,
      toAccountId: toAccount.id,
      fromAmount,
      toAmount,
      fromCurrencyCode: fromAccount.currencyId,
      toCurrencyCode: toAccount.currencyId,
    });
    await addTransactionTags(tx, createdTransactionId, tagIds);

    return createdTransactionId;
  });

  return loadCreatedTransaction(context, transactionId);
}

// Adjustment: the request sends the target displayed balance. We compare that
// target to the account's anchor balance at the posted date and persist only the
// delta needed to make future balances start from the corrected value.
export async function createBalanceAdjustmentInTransaction(
  tx: TxClient,
  context: HouseholdContext,
  input: {
    account: Pick<AccountRecord, "id" | "type" | "classification" | "currencyId">;
    accountLedgerId: string;
    balance: number;
    description: string;
    purchaseDate: Date;
    postedDate: Date;
    includeInBudget?: boolean;
    tagIds?: string[];
  },
): Promise<string> {
  if (input.account.type === "credit_card") {
    throw new ValidationError("Direct adjustments for credit card accounts are not supported");
  }

  const anchorBalance = await ledgerAccountsRepository.getAdjustmentAnchorBalanceInTransaction(
    tx,
    context.householdId,
    input.accountLedgerId,
    input.postedDate,
  );
  const targetBalance = toRawLedgerBalance(input.balance, input.account.classification);
  const accountAmount = targetBalance - anchorBalance;

  if (accountAmount === 0) {
    throw new ValidationError("Adjustment balance already matches the account balance");
  }

  const adjustmentLedger = await ledgerAccountsRepository.findOrCreateSystem(
    tx,
    `system:adjustment:${input.account.currencyId}`,
    SYSTEM_LEDGER_CLASSIFICATIONS.adjustment,
    input.account.currencyId,
  );
  const createdTransactionId = await createBaseTransaction(tx, context, {
    type: "adjustment",
    description: input.description,
    purchaseDate: input.purchaseDate,
    postedDate: input.postedDate,
    includeInBudget: input.includeInBudget ?? true,
  });

  await entriesService.createTransactionEntries(tx, createdTransactionId, [
    {
      ledgerAccountId: input.accountLedgerId,
      amount: accountAmount,
      currencyCode: input.account.currencyId,
    },
    {
      ledgerAccountId: adjustmentLedger.id,
      amount: -accountAmount,
      currencyCode: input.account.currencyId,
    },
  ]);
  await addTransactionTags(tx, createdTransactionId, input.tagIds ?? []);

  return createdTransactionId;
}

async function createAdjustment(
  context: HouseholdContext,
  dto: Extract<CreateTransactionDto, { type: "adjustment" }>,
): Promise<TransactionResponse> {
  const account = await accountsRepository.get(dto.accountId, context);
  if (!account) throw new NotFoundError("Account");

  const accountLedger = await ledgerAccountsRepository.findByOwner("account", account.id);
  if (!accountLedger) throw new NotFoundError("Account ledger");
  const tagIds = await validateTagIds(context, dto.tagIds);

  const transactionId = await db.transaction(async (tx) => {
    return createBalanceAdjustmentInTransaction(tx, context, {
      account,
      accountLedgerId: accountLedger.id,
      balance: dto.balance,
      description: dto.description,
      purchaseDate: dto.purchaseDate,
      postedDate: dto.postedDate,
      includeInBudget: dto.includeInBudget ?? true,
      tagIds,
    });
  });

  return loadCreatedTransaction(context, transactionId);
}

async function createExpenseOrIncomeEntries(
  tx: TxClient,
  input: {
    transactionId: string;
    type: "expense" | "income";
    accountId: string;
    amount: number;
    currencyCode: string;
    categoryId: string | null;
    postedDate: Date;
  },
): Promise<void> {
  const accountLedger = await ledgerAccountsRepository.findByOwner("account", input.accountId);
  if (!accountLedger) throw new NotFoundError("Account ledger");

  const systemLedger = await ledgerAccountsRepository.findOrCreateSystem(
    tx,
    `system:${input.type}:${input.currencyCode}`,
    input.type === "expense"
      ? SYSTEM_LEDGER_CLASSIFICATIONS.expense
      : SYSTEM_LEDGER_CLASSIFICATIONS.income,
    input.currencyCode,
  );

  const accountAmount = input.type === "expense" ? -input.amount : input.amount;
  const systemAmount = input.type === "expense" ? input.amount : -input.amount;

  await entriesService.createTransactionEntries(tx, input.transactionId, [
    {
      ledgerAccountId: accountLedger.id,
      amount: accountAmount,
      currencyCode: input.currencyCode,
      categoryId: input.categoryId ?? undefined,
      budgetMonth: toBudgetMonth(input.postedDate),
    },
    {
      ledgerAccountId: systemLedger.id,
      amount: systemAmount,
      currencyCode: input.currencyCode,
    },
  ]);
}

async function createTransferEntries(
  tx: TxClient,
  input: {
    transactionId: string;
    fromAccountId: string;
    toAccountId: string;
    fromAmount: number;
    toAmount: number;
    fromCurrencyCode: string;
    toCurrencyCode: string;
  },
): Promise<void> {
  const fromLedger = await ledgerAccountsRepository.findByOwner("account", input.fromAccountId);
  const toLedger = await ledgerAccountsRepository.findByOwner("account", input.toAccountId);
  if (!fromLedger || !toLedger) throw new NotFoundError("Account ledger");

  const sameCurrency = input.fromCurrencyCode === input.toCurrencyCode;
  const entries: EntryDraft[] = [
    {
      ledgerAccountId: fromLedger.id,
      amount: -input.fromAmount,
      currencyCode: input.fromCurrencyCode,
    },
    {
      ledgerAccountId: toLedger.id,
      amount: input.toAmount,
      currencyCode: input.toCurrencyCode,
    },
  ];

  if (!sameCurrency) {
    const fromTransferLedger = await ledgerAccountsRepository.findOrCreateSystem(
      tx,
      `system:offshore-transfer:${input.fromCurrencyCode}`,
      SYSTEM_LEDGER_CLASSIFICATIONS.offshoreTransfer,
      input.fromCurrencyCode,
    );
    const toTransferLedger = await ledgerAccountsRepository.findOrCreateSystem(
      tx,
      `system:offshore-transfer:${input.toCurrencyCode}`,
      SYSTEM_LEDGER_CLASSIFICATIONS.offshoreTransfer,
      input.toCurrencyCode,
    );

    entries.push(
      {
        ledgerAccountId: fromTransferLedger.id,
        amount: input.fromAmount,
        currencyCode: input.fromCurrencyCode,
      },
      {
        ledgerAccountId: toTransferLedger.id,
        amount: -input.toAmount,
        currencyCode: input.toCurrencyCode,
      },
    );
  }

  await entriesService.createTransactionEntries(tx, input.transactionId, entries);
}

// -----------------------------------------------------------------------------
// Public Service API
// -----------------------------------------------------------------------------

export async function createTransaction(
  context: HouseholdContext,
  dto: CreateTransactionDto,
): Promise<TransactionResponse> {
  switch (dto.type) {
    case "expense":
    case "income":
      return createExpenseOrIncome(context, dto);
    case "transfer":
      return createTransfer(context, dto);
    case "adjustment":
      return createAdjustment(context, dto);
    default:
      throw new ValidationError("Invalid transaction type");
  }
}

function getFeedRowHydrationKey(row: Pick<TransactionFeedRow, "rowKind" | "rowId">): string {
  return `${row.rowKind}:${row.rowId}`;
}

async function hydrateTransactionFeedPage(
  context: HouseholdContext,
  page: Awaited<ReturnType<typeof txRepository.listTransactionFeedPageKeys>>,
): Promise<TransactionFeedRow[]> {
  const transactionIds = new Set<string>();
  const installmentIds = new Set<string>();

  for (const key of page.rows) {
    if (key.transactionId && key.rowKind !== "credit_card_installment") {
      transactionIds.add(key.transactionId);
    }

    if (key.installmentId) {
      installmentIds.add(key.installmentId);
    }
  }

  const [standardRows, installmentRows] = await Promise.all([
    txRepository.listDetailedByTransactionIds(context, Array.from(transactionIds)),
    txRepository.listCreditCardInstallmentFeedRowsByIds(
      context.householdId,
      Array.from(installmentIds),
    ),
  ]);
  const standardTransactions = mapDetailedRows(standardRows);
  const accountIds = new Set<string>();

  for (const transaction of standardTransactions) {
    if (transaction.accountId) {
      accountIds.add(transaction.accountId);
    }
    if (transaction.toAccountId) {
      accountIds.add(transaction.toAccountId);
    }
  }

  const creditCardMappings = await txRepository.listCreditCardIdsByAccountIds(
    context.householdId,
    Array.from(accountIds),
  );
  const creditCardIdsByAccountId = new Map(
    creditCardMappings.map((mapping) => [mapping.accountId, mapping.creditCardId]),
  );
  const paymentMappings = await txRepository.listCreditCardPaymentMappingsByTransactionIds(
    context.householdId,
    Array.from(transactionIds),
  );
  const creditCardPaymentsByTransactionId = new Map(
    paymentMappings.map((mapping) => [
      mapping.transactionId,
      { creditCardId: mapping.creditCardId, paymentId: mapping.paymentId },
    ]),
  );
  const hydratedRows = [
    ...mapTransactionResponsesToFeedRows(
      standardTransactions,
      creditCardIdsByAccountId,
      creditCardPaymentsByTransactionId,
    ),
    ...mapCreditCardInstallmentRowsToFeedRows(installmentRows),
  ];
  const rowsByKey = new Map(hydratedRows.map((row) => [getFeedRowHydrationKey(row), row]));

  return page.rows.map((key) => {
    const row = rowsByKey.get(getFeedRowHydrationKey(key));
    if (!row) {
      throw new NotFoundError("Transaction");
    }

    return row;
  });
}

export async function listTransactions(
  context: HouseholdContext,
  query: ListTransactionsQuery,
  options: { includeAdjustments?: boolean; maxPostedDate?: string } = {},
): Promise<ListResult<TransactionFeedRow>> {
  const page = await txRepository.listTransactionFeedPageKeys(context.householdId, query, options);

  return {
    data: await hydrateTransactionFeedPage(context, page),
    meta: createListMeta(query, page.totalCount, page.summary),
  };
}

// -----------------------------------------------------------------------------
// Update + Delete Flows
// -----------------------------------------------------------------------------

export async function updateTransaction(
  context: HouseholdContext,
  transactionId: string,
  body: UpdateTransactionValues,
): Promise<TransactionResponse> {
  const rows = await txRepository.listDetailedByTransactionIds(context, [transactionId]);
  const [transaction] = mapDetailedRows(rows);

  if (!transaction) {
    throw new NotFoundError("Transaction");
  }

  let tagIds: string[] | undefined;
  if (body.tagIds !== undefined) {
    tagIds = await validateTagIds(context, body.tagIds);
  }

  const transactionUpdates: Partial<{
    description: string;
    purchaseDate: Date;
    postedDate: Date;
    includeInBudget: boolean;
    categoryId: string | null;
    merchantId: string | null;
    paymentMethodId: string | null;
  }> = {};
  let rebuildEntries:
    | {
        type: "expense" | "income";
        accountId: string;
        amount: number;
        currencyCode: string;
        categoryId: string | null;
        postedDate: Date;
      }
    | {
        type: "transfer";
        fromAccountId: string;
        toAccountId: string;
        fromAmount: number;
        toAmount: number;
        fromCurrencyCode: string;
        toCurrencyCode: string;
      }
    | null = null;

  if (body.description !== undefined) transactionUpdates.description = body.description;
  if (body.purchaseDate !== undefined) transactionUpdates.purchaseDate = body.purchaseDate;
  if (body.postedDate !== undefined) transactionUpdates.postedDate = body.postedDate;
  if (body.includeInBudget !== undefined) transactionUpdates.includeInBudget = body.includeInBudget;

  if (transaction.type === "expense" || transaction.type === "income") {
    if (body.fromAccountId !== undefined || body.toAccountId !== undefined) {
      throw new ValidationError(
        `Transfer account updates are not supported for ${transaction.type} transactions`,
      );
    }
    if (body.fromAmount !== undefined || body.toAmount !== undefined) {
      throw new ValidationError(
        `Transfer amount updates are not supported for ${transaction.type} transactions`,
      );
    }

    const nextAccountId = body.accountId ?? transaction.accountId;
    if (!nextAccountId) {
      throw new ValidationError(`Account is required for ${transaction.type} transactions`);
    }

    const account = await accountsRepository.get(nextAccountId, context);
    if (!account) throw new NotFoundError("Account");
    if (account.type === "credit_card") {
      throw new ValidationError(
        `Direct ${transaction.type} updates for credit card accounts must use the credit card APIs`,
      );
    }

    const nextCurrencyCode = body.currencyCode ?? account.currencyId;
    if (account.currencyId !== nextCurrencyCode) {
      throw new ValidationError("Transaction currency must match account currency");
    }

    const nextCategoryId = body.categoryId !== undefined ? body.categoryId : transaction.categoryId;
    await validateCategory(context, nextCategoryId, transaction.type);

    if (body.merchantId !== undefined) {
      await validateOptionalMerchant(context, body.merchantId);
      transactionUpdates.merchantId = body.merchantId;
    }

    const paymentMethodCode = body.paymentMethodCode ?? transaction.paymentMethodCode;
    if (!paymentMethodCode) {
      throw new ValidationError(`Payment method is required for ${transaction.type} transactions`);
    }

    const paymentMethod = await resolvePaymentMethod(context, paymentMethodCode, nextCurrencyCode);
    const nextPostedDate = body.postedDate ?? parseISODate(transaction.postedDate);
    const nextAmount = body.amount ?? transaction.amount;

    if (body.categoryId !== undefined) transactionUpdates.categoryId = nextCategoryId;
    if (body.paymentMethodCode !== undefined || paymentMethod.id !== transaction.paymentMethodId) {
      transactionUpdates.paymentMethodId = paymentMethod.id;
    }

    const shouldRebuildEntries =
      body.amount !== undefined ||
      body.accountId !== undefined ||
      body.currencyCode !== undefined ||
      body.categoryId !== undefined ||
      body.postedDate !== undefined;

    if (shouldRebuildEntries) {
      rebuildEntries = {
        type: transaction.type,
        accountId: nextAccountId,
        amount: nextAmount,
        currencyCode: nextCurrencyCode,
        categoryId: nextCategoryId,
        postedDate: nextPostedDate,
      };
    }
  } else if (transaction.type === "transfer") {
    if (body.categoryId !== undefined) {
      throw new ValidationError("Category updates are not supported for transfer transactions");
    }
    if (body.paymentMethodCode !== undefined) {
      throw new ValidationError(
        "Payment method updates are not supported for transfer transactions",
      );
    }
    if (body.merchantId !== undefined) {
      throw new ValidationError("Merchant updates are not supported for transfer transactions");
    }
    if (
      body.accountId !== undefined ||
      body.amount !== undefined ||
      body.currencyCode !== undefined
    ) {
      throw new ValidationError(
        "Use fromAccountId, toAccountId, fromAmount, and toAmount to update transfer transactions",
      );
    }

    const fromAccountId = body.fromAccountId ?? transaction.accountId;
    const toAccountId = body.toAccountId ?? transaction.toAccountId;
    if (!fromAccountId || !toAccountId) {
      throw new ValidationError("Transfer source and destination accounts are required");
    }
    if (fromAccountId === toAccountId) {
      throw new ValidationError("Transfer source and destination must be different accounts");
    }

    const fromAccount = await accountsRepository.get(fromAccountId, context);
    if (!fromAccount) throw new NotFoundError("Source account");
    if (fromAccount.type === "credit_card") {
      throw new ValidationError(
        "Direct transfers from credit card accounts must use the credit card payment endpoint",
      );
    }

    const toAccount = await accountsRepository.get(toAccountId, context);
    if (!toAccount) throw new NotFoundError("Destination account");
    if (toAccount.type === "credit_card") {
      throw new ValidationError(
        "Direct transfers to credit card accounts must use the credit card payment endpoint",
      );
    }

    const amountChanged = body.fromAmount !== undefined || body.toAmount !== undefined;
    const nextPostedDate = body.postedDate ?? parseISODate(transaction.postedDate);
    const { fromAmount, toAmount } = await resolveTransferAmounts({
      fromCurrencyCode: fromAccount.currencyId,
      toCurrencyCode: toAccount.currencyId,
      fromAmount: amountChanged ? body.fromAmount : transaction.amount,
      toAmount: amountChanged ? body.toAmount : (transaction.toAmount ?? transaction.amount),
      postedDate: nextPostedDate,
      convertAmount: (input) => fxService.convertAmount(input),
    });

    const shouldRebuildEntries =
      body.fromAccountId !== undefined ||
      body.toAccountId !== undefined ||
      body.fromAmount !== undefined ||
      body.toAmount !== undefined;

    if (shouldRebuildEntries) {
      rebuildEntries = {
        type: "transfer",
        fromAccountId,
        toAccountId,
        fromAmount,
        toAmount,
        fromCurrencyCode: fromAccount.currencyId,
        toCurrencyCode: toAccount.currencyId,
      };
    }
  } else {
    if (
      body.categoryId !== undefined ||
      body.paymentMethodCode !== undefined ||
      body.merchantId !== undefined ||
      body.accountId !== undefined ||
      body.amount !== undefined ||
      body.currencyCode !== undefined ||
      body.fromAccountId !== undefined ||
      body.toAccountId !== undefined ||
      body.fromAmount !== undefined ||
      body.toAmount !== undefined
    ) {
      throw new ValidationError(
        `Only metadata updates are supported for ${transaction.type} transactions`,
      );
    }
  }

  await db.transaction(async (tx) => {
    const updated = await txRepository.updateTransaction(
      tx,
      context.householdId,
      transactionId,
      transactionUpdates,
    );
    if (!updated) {
      throw new NotFoundError("Transaction");
    }

    if (rebuildEntries) {
      await entriesRepository.deleteByTransactionId(tx, transactionId);

      if (rebuildEntries.type === "transfer") {
        await createTransferEntries(tx, {
          transactionId,
          fromAccountId: rebuildEntries.fromAccountId,
          toAccountId: rebuildEntries.toAccountId,
          fromAmount: rebuildEntries.fromAmount,
          toAmount: rebuildEntries.toAmount,
          fromCurrencyCode: rebuildEntries.fromCurrencyCode,
          toCurrencyCode: rebuildEntries.toCurrencyCode,
        });
      } else {
        await createExpenseOrIncomeEntries(tx, {
          transactionId,
          type: rebuildEntries.type,
          accountId: rebuildEntries.accountId,
          amount: rebuildEntries.amount,
          currencyCode: rebuildEntries.currencyCode,
          categoryId: rebuildEntries.categoryId,
          postedDate: rebuildEntries.postedDate,
        });
      }
    }

    if (body.tagIds !== undefined) {
      await replaceTransactionTags(tx, transactionId, tagIds ?? []);
    }
  });

  return loadCreatedTransaction(context, transactionId);
}

export async function deleteTransaction(
  context: HouseholdContext,
  transactionId: string,
): Promise<void> {
  const deleted = await txRepository.deleteTransaction(context.householdId, transactionId);
  if (!deleted) {
    throw new NotFoundError("Transaction");
  }
}
