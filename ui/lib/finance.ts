import type {
  AccountClassification,
  AccountHttp,
  AccountType,
} from "@/interfaces/http/accounts";
import type { TransactionType } from "@/interfaces/http/transactions";

const LANGUAGE_TO_LOCALE: Record<string, string> = {
  en: "en-US",
  "pt-BR": "pt-BR",
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  depository: "Depository",
  loan: "Loan",
  credit_card: "Credit Card",
  property: "Property",
  vehicle: "Vehicle",
  other_asset: "Other Asset",
  other_liability: "Other Liability",
};

export const CLASSIFICATION_LABELS: Record<AccountClassification, string> = {
  asset: "Assets",
  liability: "Liabilities",
};

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  expense: "Expense",
  income: "Income",
  transfer: "Transfer",
  adjustment: "Adjustment",
};

export function getLocale(language = "en") {
  return LANGUAGE_TO_LOCALE[language] ?? "en-US";
}

export function formatCurrency(
  amount: number,
  currencyCode: string,
  language = "en",
  options?: Intl.NumberFormatOptions,
) {
  return new Intl.NumberFormat(getLocale(language), {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    ...options,
  }).format(amount / 100);
}

export function formatSignedCurrency(
  amount: number,
  currencyCode: string,
  language = "en",
) {
  return `${amount > 0 ? "+" : amount < 0 ? "-" : ""}${formatCurrency(Math.abs(amount), currencyCode, language)}`;
}

export function formatDate(value: string | Date, language = "en") {
  const date = typeof value === "string" ? new Date(`${value}T12:00:00`) : value;
  return new Intl.DateTimeFormat(getLocale(language), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatMonthLabel(monthKey: string, language = "en") {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat(getLocale(language), {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function shiftMonthKey(monthKey: string, offset: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function isCreditCardAccount(account: Pick<AccountHttp, "type">) {
  return account.type === "credit_card";
}

export function maskCardNumber(last4: string) {
  return `•••• •••• •••• ${last4}`;
}

export function getTransactionTone(type: TransactionType) {
  if (type === "income") return "positive";
  if (type === "expense") return "negative";
  return "neutral";
}

export function groupAccounts(accounts: AccountHttp[]) {
  return {
    asset: accounts.filter((account) => account.classification === "asset"),
    liability: accounts.filter((account) => account.classification === "liability"),
  };
}

export function sumAmounts(items: Array<{ amount: number }>) {
  return items.reduce((total, item) => total + item.amount, 0);
}

export function sumAccountBalances(
  accounts: AccountHttp[],
  classification: AccountClassification,
) {
  return accounts
    .filter((account) => account.classification === classification)
    .reduce((total, account) => total + account.balance, 0);
}

export function sortByDateDescending<T extends { postedDate?: string; createdAt?: string }>(items: T[]) {
  return [...items].sort((left, right) => {
    const leftDate = left.postedDate ?? left.createdAt ?? "";
    const rightDate = right.postedDate ?? right.createdAt ?? "";
    return rightDate.localeCompare(leftDate);
  });
}
