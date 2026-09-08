import { and, asc, eq, sql } from "drizzle-orm";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";
import { budgetsTable } from "@/db/schemas/budgets.schema";
import { categoriesTable } from "@/db/schemas/categories.schema";
import { creditCardBudgetRecognitionsTable } from "@/db/schemas/credit-card-budget-recognitions.schema";
import { creditCardPurchasesTable } from "@/db/schemas/credit-card-purchases.schema";
import { creditCardsTable } from "@/db/schemas/credit-cards.schema";
import { entriesTable } from "@/db/schemas/entries.schema";
import { ledgerAccountsTable } from "@/db/schemas/ledger-accounts.schema";
import { transactionsTable } from "@/db/schemas/transactions.schema";
import type { TxClient } from "@/db/types";
import { now } from "@/shared/lib/date";
import { HouseholdScopedRepository } from "@/shared/repositories/household-scoped.repository";
import type { BudgetRecord } from "./budgets.types";

type CreateBudgetValues = Omit<
  typeof budgetsTable.$inferInsert,
  "id" | "householdId" | "createdAt" | "updatedAt"
>;

class BudgetRepository extends HouseholdScopedRepository<BudgetRecord, CreateBudgetValues> {
  constructor() {
    super(budgetsTable, { orderBy: budgetsTable.month });
  }

  async listMonthBudgets(householdId: string, month: Date) {
    return db
      .select({
        id: budgetsTable.id,
        categoryId: budgetsTable.categoryId,
        amount: budgetsTable.amount,
        categoryName: categoriesTable.name,
        parentId: categoriesTable.parentId,
        categoryType: categoriesTable.type,
      })
      .from(budgetsTable)
      .innerJoin(categoriesTable, eq(categoriesTable.id, budgetsTable.categoryId))
      .where(and(eq(budgetsTable.householdId, householdId), eq(budgetsTable.month, month)))
      .orderBy(asc(categoriesTable.type), asc(categoriesTable.name));
  }

  async listMonthActuals(householdId: string, month: Date) {
    return db
      .select({
        categoryId: transactionsTable.categoryId,
        categoryName: categoriesTable.name,
        parentId: categoriesTable.parentId,
        categoryType: categoriesTable.type,
        currencyCode: entriesTable.currencyId,
        effectiveDate: transactionsTable.postedDate,
        actualAmount: sql<number>`coalesce(sum(abs(${entriesTable.amount})), 0)`.mapWith(Number),
      })
      .from(entriesTable)
      .innerJoin(transactionsTable, eq(transactionsTable.id, entriesTable.transactionId))
      .innerJoin(ledgerAccountsTable, eq(ledgerAccountsTable.id, entriesTable.ledgerAccountId))
      .innerJoin(categoriesTable, eq(categoriesTable.id, transactionsTable.categoryId))
      .where(
        and(
          eq(transactionsTable.householdId, householdId),
          eq(transactionsTable.includeInBudget, true),
          eq(ledgerAccountsTable.ownerType, "account"),
          eq(entriesTable.budgetMonth, month),
        ),
      )
      .groupBy(
        transactionsTable.categoryId,
        categoriesTable.name,
        categoriesTable.parentId,
        categoriesTable.type,
        entriesTable.currencyId,
        transactionsTable.postedDate,
      )
      .orderBy(
        asc(categoriesTable.type),
        asc(categoriesTable.name),
        asc(transactionsTable.postedDate),
      );
  }

  async listMonthCreditCardActuals(householdId: string, month: Date) {
    return db
      .select({
        categoryId: creditCardBudgetRecognitionsTable.categoryId,
        categoryName: categoriesTable.name,
        parentId: categoriesTable.parentId,
        categoryType: categoriesTable.type,
        currencyCode: creditCardBudgetRecognitionsTable.currencyId,
        effectiveDate: creditCardBudgetRecognitionsTable.budgetMonth,
        actualAmount:
          sql<number>`coalesce(sum(${creditCardBudgetRecognitionsTable.amount}), 0)`.mapWith(
            Number,
          ),
      })
      .from(creditCardBudgetRecognitionsTable)
      .innerJoin(
        categoriesTable,
        eq(categoriesTable.id, creditCardBudgetRecognitionsTable.categoryId),
      )
      .innerJoin(
        creditCardPurchasesTable,
        eq(creditCardPurchasesTable.id, creditCardBudgetRecognitionsTable.purchaseId),
      )
      .innerJoin(creditCardsTable, eq(creditCardsTable.id, creditCardPurchasesTable.creditCardId))
      .where(
        and(
          eq(creditCardsTable.householdId, householdId),
          eq(creditCardBudgetRecognitionsTable.budgetMonth, month),
        ),
      )
      .groupBy(
        creditCardBudgetRecognitionsTable.categoryId,
        creditCardBudgetRecognitionsTable.currencyId,
        creditCardBudgetRecognitionsTable.budgetMonth,
        categoriesTable.name,
        categoriesTable.parentId,
        categoriesTable.type,
      )
      .orderBy(asc(categoriesTable.type), asc(categoriesTable.name));
  }

  async listBudgetsForHousehold(householdId: string): Promise<BudgetRecord[]> {
    return db
      .select()
      .from(budgetsTable)
      .where(eq(budgetsTable.householdId, householdId))
      .orderBy(asc(budgetsTable.month));
  }

  async updateBudgetAmount(tx: TxClient, budgetId: string, amount: number): Promise<void> {
    await tx
      .update(budgetsTable)
      .set({ amount, updatedAt: now() })
      .where(eq(budgetsTable.id, budgetId));
  }

  async replaceMonthBudgets(
    tx: TxClient,
    context: HouseholdContext,
    month: Date,
    values: Array<{
      categoryId: string;
      amount: number;
    }>,
  ): Promise<void> {
    await tx
      .delete(budgetsTable)
      .where(and(eq(budgetsTable.householdId, context.householdId), eq(budgetsTable.month, month)));

    if (values.length === 0) {
      return;
    }

    await tx.insert(budgetsTable).values(
      values.map((value) => ({
        householdId: context.householdId,
        month,
        categoryId: value.categoryId,
        amount: value.amount,
      })),
    );
  }
}

export const budgetsRepository = new BudgetRepository();
