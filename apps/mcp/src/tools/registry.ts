import {
  createAccount,
  createCreditCard,
  deleteAccount,
  deleteCreditCard,
  updateAccount,
  updateCreditCard,
} from "./accounts.js";
import {
  createRecurringBill,
  deleteRecurringBill,
  listRecurringBills,
  markBillPaid,
  reportBills,
  setBudget,
  updateRecurringBill,
} from "./bills.js";
import {
  bulkCategorizeTransactions,
  bulkDeleteTransactions,
  bulkUpdateTransactions,
} from "./bulk-transactions.js";
import { listIcons } from "./icons.js";
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
import { cancelPurchase, createCreditCardPayment, createRefund } from "./refunds.js";
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
  listIcons,
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
  createRefund,
  cancelPurchase,
  createCreditCardPayment,
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
  createRecurringBill,
  listRecurringBills,
  updateRecurringBill,
  deleteRecurringBill,
  markBillPaid,
  reportBills,
  setBudget,
];
