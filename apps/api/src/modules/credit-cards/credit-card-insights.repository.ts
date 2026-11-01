import { accountsTable } from "@luraba/db/schemas/accounts.schema";
import { categoriesTable } from "@luraba/db/schemas/categories.schema";
import { creditCardBillingCyclesTable } from "@luraba/db/schemas/credit-card-billing-cycles.schema";
import { creditCardInstallmentsTable } from "@luraba/db/schemas/credit-card-installments.schema";
import { creditCardPurchasesTable } from "@luraba/db/schemas/credit-card-purchases.schema";
import { creditCardsTable } from "@luraba/db/schemas/credit-cards.schema";
import { transactionsTable } from "@luraba/db/schemas/transactions.schema";
import { formatISODate } from "@luraba/domain";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";

export interface InsightInstallmentRow {
  currencyCode: string;
  /** `YYYY-MM` of the due date of the invoice the installment is on. */
  dueMonth: string;
  amount: number;
  installmentCount: number;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
}

/** Every installment of the household's cards on invoices due between two dates (inclusive). */
export async function listInstallmentsDueBetween(
  householdId: string,
  from: Date,
  to: Date,
): Promise<InsightInstallmentRow[]> {
  const rows = await db
    .select({
      currencyCode: accountsTable.currencyId,
      dueDate: creditCardBillingCyclesTable.dueDate,
      amount: creditCardInstallmentsTable.amount,
      installmentCount: creditCardPurchasesTable.installmentCount,
      categoryId: transactionsTable.categoryId,
      categoryName: categoriesTable.name,
      categoryColor: categoriesTable.color,
    })
    .from(creditCardInstallmentsTable)
    .innerJoin(
      creditCardBillingCyclesTable,
      eq(creditCardBillingCyclesTable.id, creditCardInstallmentsTable.billingCycleId),
    )
    .innerJoin(
      creditCardPurchasesTable,
      eq(creditCardPurchasesTable.id, creditCardInstallmentsTable.purchaseId),
    )
    .innerJoin(creditCardsTable, eq(creditCardsTable.id, creditCardInstallmentsTable.creditCardId))
    .innerJoin(accountsTable, eq(accountsTable.id, creditCardsTable.ownerAccountId))
    .innerJoin(transactionsTable, eq(transactionsTable.id, creditCardPurchasesTable.transactionId))
    .leftJoin(categoriesTable, eq(categoriesTable.id, transactionsTable.categoryId))
    .where(
      and(
        eq(creditCardsTable.householdId, householdId),
        gte(creditCardBillingCyclesTable.dueDate, from),
        lte(creditCardBillingCyclesTable.dueDate, to),
      ),
    );

  return rows.map(({ dueDate, ...row }) => ({
    ...row,
    dueMonth: formatISODate(dueDate).slice(0, 7),
    amount: Number(row.amount),
  }));
}
