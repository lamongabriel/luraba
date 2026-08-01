export const PERMISSIONS = {
  HOUSEHOLD_READ: "household.read",
  HOUSEHOLD_UPDATE: "household.update",
  HOUSEHOLD_MEMBERS_READ: "household.members.read",
  HOUSEHOLD_MEMBERS_MANAGE: "household.members.manage",
  HOUSEHOLD_INVITES_MANAGE: "household.invites.manage",

  ACCOUNTS_READ: "accounts.read",
  ACCOUNTS_CREATE: "accounts.create",
  ACCOUNTS_UPDATE: "accounts.update",
  ACCOUNTS_DELETE: "accounts.delete",

  TRANSACTIONS_READ: "transactions.read",
  TRANSACTIONS_CREATE: "transactions.create",
  TRANSACTIONS_UPDATE: "transactions.update",
  TRANSACTIONS_DELETE: "transactions.delete",

  CATEGORIES_READ: "categories.read",
  CATEGORIES_CREATE: "categories.create",
  CATEGORIES_UPDATE: "categories.update",
  CATEGORIES_DELETE: "categories.delete",

  TAGS_READ: "tags.read",
  TAGS_CREATE: "tags.create",
  TAGS_UPDATE: "tags.update",
  TAGS_DELETE: "tags.delete",

  PAYMENT_METHODS_READ: "paymentMethods.read",
  PAYMENT_METHODS_CREATE: "paymentMethods.create",
  PAYMENT_METHODS_UPDATE: "paymentMethods.update",
  PAYMENT_METHODS_DELETE: "paymentMethods.delete",

  MERCHANTS_READ: "merchants.read",
  MERCHANTS_CREATE: "merchants.create",
  MERCHANTS_UPDATE: "merchants.update",
  MERCHANTS_DELETE: "merchants.delete",

  INTEGRATIONS_READ: "integrations.read",
  INTEGRATIONS_UPDATE: "integrations.update",
  INTEGRATIONS_DELETE: "integrations.delete",

  BUDGETS_READ: "budgets.read",
  BUDGETS_UPDATE: "budgets.update",

  CREDIT_CARDS_READ: "creditCards.read",
  CREDIT_CARDS_CREATE: "creditCards.create",
  CREDIT_CARDS_UPDATE: "creditCards.update",
  CREDIT_CARDS_DELETE: "creditCards.delete",
} as const

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]
export type PermissionMatch = "any" | "all"
export type PermissionInput = PermissionKey | readonly PermissionKey[]
