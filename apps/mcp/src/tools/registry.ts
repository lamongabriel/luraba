import {
  createAccount,
  createCreditCard,
  deleteAccount,
  deleteCreditCard,
  updateAccount,
  updateCreditCard,
} from "./accounts.js";
import {
  bulkCategorizeTransactions,
  bulkDeleteTransactions,
  bulkUpdateTransactions,
} from "./bulk-transactions.js";
import {
  createCategory,
  createMerchant,
  createTag,
  listAccounts,
  listCategories,
  listCreditCards,
  listHouseholds,
  listMerchants,
  listTags,
  updateCategory,
  updateMerchant,
  updateTag,
  whoami,
} from "./reference.js";
import {
  reportBalances,
  reportBudget,
  reportCreditCards,
  reportGoals,
  reportIncomeExpense,
  reportSpending,
  reportTopExpenses,
} from "./reports.js";
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  searchTransactions,
  updateTransaction,
} from "./transactions.js";
import type { ToolDefinition } from "./types.js";

// biome-ignore lint/suspicious/noExplicitAny: the registry holds tools of different input shapes
export type AnyTool = ToolDefinition<any>;

/** Every tool the server exposes. Add new tools here (see apps/mcp/README.md). */
export const tools: AnyTool[] = [
  whoami,
  listHouseholds,
  listAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  listCreditCards,
  createCreditCard,
  updateCreditCard,
  deleteCreditCard,
  listCategories,
  createCategory,
  updateCategory,
  listMerchants,
  createMerchant,
  updateMerchant,
  listTags,
  createTag,
  updateTag,
  searchTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  bulkUpdateTransactions,
  bulkCategorizeTransactions,
  bulkDeleteTransactions,
  reportSpending,
  reportIncomeExpense,
  reportBalances,
  reportCreditCards,
  reportBudget,
  reportGoals,
  reportTopExpenses,
];
