import { accountsTable } from "@luraba/db/schemas/accounts.schema";
import { categoriesTable } from "@luraba/db/schemas/categories.schema";
import { entriesTable } from "@luraba/db/schemas/entries.schema";
import { ledgerAccountsTable } from "@luraba/db/schemas/ledger-accounts.schema";
import { merchantsTable } from "@luraba/db/schemas/merchants.schema";
import { paymentMethodsTable } from "@luraba/db/schemas/payment-methods.schema";
import { tagsTable } from "@luraba/db/schemas/tags.schema";
import { transactionTagsTable } from "@luraba/db/schemas/transaction-tags.schema";
import { transactionsTable } from "@luraba/db/schemas/transactions.schema";
import { formatDecimalAmount } from "@luraba/domain";
import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import type { Exporter } from "../exports.types";

const columns = [
  "transaction_id",
  "posted_date",
  "purchase_date",
  "type",
  "description",
  "account",
  "amount",
  "currency",
  "category",
  "merchant",
  "payment_method",
  "tags",
];

/**
 * One line per account touched by a transaction (the "statement view"): an expense is one line on
 * its account, a transfer two. Amounts are decimal and signed on that account; credit card
 * purchases appear on the card's account.
 */
export const transactionsExporter: Exporter = {
  id: "transactions",
  label: "Transactions",
  description:
    "Every transaction line per account, with category, merchant, payment method and tags.",
  formats: ["csv", "json"],
  supportsDateRange: true,
  async load(context, range) {
    const rows = await db
      .select({
        id: transactionsTable.id,
        postedDate: transactionsTable.postedDate,
        purchaseDate: transactionsTable.purchaseDate,
        type: transactionsTable.type,
        description: transactionsTable.description,
        account: accountsTable.name,
        amount: entriesTable.amount,
        currency: entriesTable.currencyId,
        category: categoriesTable.name,
        merchant: merchantsTable.name,
        paymentMethod: paymentMethodsTable.code,
      })
      .from(transactionsTable)
      .innerJoin(entriesTable, eq(entriesTable.transactionId, transactionsTable.id))
      .innerJoin(
        ledgerAccountsTable,
        and(
          eq(ledgerAccountsTable.id, entriesTable.ledgerAccountId),
          eq(ledgerAccountsTable.ownerType, "account"),
        ),
      )
      .innerJoin(accountsTable, eq(accountsTable.id, ledgerAccountsTable.ownerId))
      .leftJoin(categoriesTable, eq(categoriesTable.id, transactionsTable.categoryId))
      .leftJoin(merchantsTable, eq(merchantsTable.id, transactionsTable.merchantId))
      .leftJoin(paymentMethodsTable, eq(paymentMethodsTable.id, transactionsTable.paymentMethodId))
      .where(
        and(
          eq(transactionsTable.householdId, context.householdId),
          range.dateFrom
            ? gte(transactionsTable.postedDate, new Date(`${range.dateFrom}T00:00:00Z`))
            : undefined,
          range.dateTo
            ? lte(transactionsTable.postedDate, new Date(`${range.dateTo}T00:00:00Z`))
            : undefined,
        ),
      )
      .orderBy(asc(transactionsTable.postedDate), asc(transactionsTable.createdAt));

    const ids = [...new Set(rows.map((row) => row.id))];
    const tagsByTransaction = new Map<string, string[]>();
    for (let i = 0; i < ids.length; i += 1000) {
      const tagRows = await db
        .select({ transactionId: transactionTagsTable.transactionId, name: tagsTable.name })
        .from(transactionTagsTable)
        .innerJoin(tagsTable, eq(tagsTable.id, transactionTagsTable.tagId))
        .where(inArray(transactionTagsTable.transactionId, ids.slice(i, i + 1000)))
        .orderBy(asc(transactionTagsTable.position));
      for (const tag of tagRows)
        tagsByTransaction.set(tag.transactionId, [
          ...(tagsByTransaction.get(tag.transactionId) ?? []),
          tag.name,
        ]);
    }

    return {
      transactions: {
        columns,
        records: rows.map((row) => ({
          transaction_id: row.id,
          posted_date: row.postedDate.toISOString().slice(0, 10),
          purchase_date: row.purchaseDate.toISOString().slice(0, 10),
          type: row.type,
          description: row.description,
          account: row.account,
          amount: formatDecimalAmount(row.amount),
          currency: row.currency,
          category: row.category,
          merchant: row.merchant,
          payment_method: row.paymentMethod,
          tags: (tagsByTransaction.get(row.id) ?? []).join("|"),
        })),
      },
    };
  },
};
