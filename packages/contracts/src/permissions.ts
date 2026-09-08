import { z } from "zod";

export const householdRoleSchema = z.enum(["owner", "admin", "member", "viewer"]);
export type HouseholdRole = z.output<typeof householdRoleSchema>;

export const storedHouseholdInviteStatusSchema = z.enum([
  "pending",
  "accepted",
  "rejected",
  "canceled",
]);
export const householdInviteStatusSchema = z.enum([
  ...storedHouseholdInviteStatusSchema.options,
  "expired",
]);
export type StoredHouseholdInviteStatus = z.output<typeof storedHouseholdInviteStatusSchema>;
export type HouseholdInviteStatus = z.output<typeof householdInviteStatusSchema>;

export const PERMISSIONS = {
  HOUSEHOLD_READ: "household.read",
  HOUSEHOLD_UPDATE: "household.update",
  HOUSEHOLD_DELETE: "household.delete",
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
  RECURRING_BILLS_READ: "recurringBills.read",
  RECURRING_BILLS_CREATE: "recurringBills.create",
  RECURRING_BILLS_UPDATE: "recurringBills.update",
  RECURRING_BILLS_DELETE: "recurringBills.delete",
} as const;

export const householdPermissionSchema = z.enum(PERMISSIONS);
export type HouseholdPermission = z.output<typeof householdPermissionSchema>;
export type PermissionKey = HouseholdPermission;
export type PermissionMatch = "any" | "all";
export type PermissionInput = PermissionKey | readonly PermissionKey[];

export const HOUSEHOLD_ROLE_METADATA = {
  owner: { label: "Owner", description: "Full household control.", canBeInvited: false },
  admin: { label: "Admin", description: "Manage members and invitations.", canBeInvited: true },
  member: { label: "Member", description: "Manage permitted finance data.", canBeInvited: true },
  viewer: { label: "Viewer", description: "Read-only household access.", canBeInvited: true },
} as const satisfies Record<
  HouseholdRole,
  { label: string; description: string; canBeInvited: boolean }
>;

const allPermissions = new Set<HouseholdPermission>(Object.values(PERMISSIONS));

/**
 * The product's role policy. Both clients and the API use this for consistent
 * capability checks; the API remains the authority that enforces it.
 */
export const HOUSEHOLD_ROLE_PERMISSIONS: Readonly<
  Record<HouseholdRole, ReadonlySet<HouseholdPermission>>
> = {
  owner: allPermissions,
  admin: new Set(
    Object.values(PERMISSIONS).filter(
      (permission) =>
        permission !== PERMISSIONS.HOUSEHOLD_UPDATE && permission !== PERMISSIONS.HOUSEHOLD_DELETE,
    ),
  ),
  member: new Set([
    PERMISSIONS.HOUSEHOLD_READ,
    PERMISSIONS.ACCOUNTS_READ,
    PERMISSIONS.ACCOUNTS_CREATE,
    PERMISSIONS.TRANSACTIONS_READ,
    PERMISSIONS.TRANSACTIONS_CREATE,
    PERMISSIONS.CATEGORIES_READ,
    PERMISSIONS.TAGS_READ,
    PERMISSIONS.PAYMENT_METHODS_READ,
    PERMISSIONS.PAYMENT_METHODS_CREATE,
    PERMISSIONS.MERCHANTS_READ,
    PERMISSIONS.BUDGETS_READ,
    PERMISSIONS.CREDIT_CARDS_READ,
    PERMISSIONS.RECURRING_BILLS_READ,
    PERMISSIONS.RECURRING_BILLS_UPDATE,
    PERMISSIONS.RECURRING_BILLS_DELETE,
  ]),
  viewer: new Set([
    PERMISSIONS.HOUSEHOLD_READ,
    PERMISSIONS.ACCOUNTS_READ,
    PERMISSIONS.TRANSACTIONS_READ,
    PERMISSIONS.CATEGORIES_READ,
    PERMISSIONS.TAGS_READ,
    PERMISSIONS.PAYMENT_METHODS_READ,
    PERMISSIONS.MERCHANTS_READ,
    PERMISSIONS.BUDGETS_READ,
    PERMISSIONS.CREDIT_CARDS_READ,
    PERMISSIONS.RECURRING_BILLS_READ,
    PERMISSIONS.RECURRING_BILLS_CREATE,
  ]),
};

export function getPermissionsForRole(role: HouseholdRole): HouseholdPermission[] {
  return Array.from(HOUSEHOLD_ROLE_PERMISSIONS[role]);
}

export function hasHouseholdPermission(
  role: HouseholdRole,
  permission: HouseholdPermission,
): boolean {
  return HOUSEHOLD_ROLE_PERMISSIONS[role].has(permission);
}
