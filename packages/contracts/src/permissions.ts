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
  PRODUCTS_READ: "products.read",
  PRODUCTS_CREATE: "products.create",
  PRODUCTS_UPDATE: "products.update",
  PRODUCTS_DELETE: "products.delete",
  INTEGRATIONS_READ: "integrations.read",
  INTEGRATIONS_UPDATE: "integrations.update",
  INTEGRATIONS_DELETE: "integrations.delete",
  BILLS_READ: "bills.read",
  BILLS_CREATE: "bills.create",
  BILLS_UPDATE: "bills.update",
  BILLS_DELETE: "bills.delete",
  SPLITS_READ: "splits.read",
  SPLITS_CREATE: "splits.create",
  SPLITS_UPDATE: "splits.update",
  SPLITS_DELETE: "splits.delete",
  GOALS_READ: "goals.read",
  GOALS_CREATE: "goals.create",
  GOALS_UPDATE: "goals.update",
  GOALS_DELETE: "goals.delete",
  IMPORTS_READ: "imports.read",
  IMPORTS_CREATE: "imports.create",
  IMPORTS_DELETE: "imports.delete",
  EXPORTS_READ: "exports.read",
  UPLOADS_READ: "uploads.read",
  UPLOADS_CREATE: "uploads.create",
  UPLOADS_DELETE: "uploads.delete",
  INVESTMENTS_READ: "investments.read",
  INVESTMENTS_WRITE: "investments.write",
  INVESTMENTS_DELETE: "investments.delete",
  BUDGETS_READ: "budgets.read",
  BUDGETS_UPDATE: "budgets.update",
  CREDIT_CARDS_READ: "creditCards.read",
  CREDIT_CARDS_CREATE: "creditCards.create",
  CREDIT_CARDS_UPDATE: "creditCards.update",
  CREDIT_CARDS_DELETE: "creditCards.delete",
} as const;

export const householdPermissionSchema = z.enum(PERMISSIONS);
export type HouseholdPermission = z.output<typeof householdPermissionSchema>;
export type PermissionKey = HouseholdPermission;
export type PermissionMatch = "any" | "all";
export type PermissionInput = PermissionKey | readonly PermissionKey[];

export const HOUSEHOLD_ROLE_METADATA = {
  owner: {
    label: "Owner",
    description:
      "Full control of the household, its members and its data. The only role that can change the household itself, delete it, or manage other owners.",
    canBeInvited: false,
  },
  admin: {
    label: "Admin",
    description:
      "Runs the household day to day: manages members and invitations (except owners and other admins) and every kind of finance data. Cannot edit or delete the household.",
    canBeInvited: true,
  },
  member: {
    label: "Member",
    description:
      "Records everyday finance: transactions, bills, goals, splits, investments and imports. Cannot change shared setup such as categories, tags, budgets or credit cards, and cannot manage people.",
    canBeInvited: true,
  },
  viewer: {
    label: "Viewer",
    description:
      "Read-only. Can look at the household's finances and download exports, but cannot change anything or see who else is in the household.",
    canBeInvited: true,
  },
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
    PERMISSIONS.BILLS_READ,
    PERMISSIONS.BILLS_CREATE,
    PERMISSIONS.BILLS_UPDATE,
    PERMISSIONS.SPLITS_READ,
    PERMISSIONS.SPLITS_CREATE,
    PERMISSIONS.SPLITS_UPDATE,
    PERMISSIONS.GOALS_READ,
    PERMISSIONS.GOALS_CREATE,
    PERMISSIONS.GOALS_UPDATE,
    PERMISSIONS.IMPORTS_READ,
    PERMISSIONS.IMPORTS_CREATE,
    PERMISSIONS.IMPORTS_DELETE,
    PERMISSIONS.EXPORTS_READ,
    PERMISSIONS.UPLOADS_READ,
    PERMISSIONS.UPLOADS_CREATE,
    PERMISSIONS.CATEGORIES_READ,
    PERMISSIONS.TAGS_READ,
    PERMISSIONS.PAYMENT_METHODS_READ,
    PERMISSIONS.PAYMENT_METHODS_CREATE,
    PERMISSIONS.MERCHANTS_READ,
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.PRODUCTS_CREATE,
    PERMISSIONS.PRODUCTS_UPDATE,
    PERMISSIONS.BUDGETS_READ,
    PERMISSIONS.CREDIT_CARDS_READ,
    PERMISSIONS.INVESTMENTS_READ,
    PERMISSIONS.INVESTMENTS_WRITE,
  ]),
  viewer: new Set([
    PERMISSIONS.HOUSEHOLD_READ,
    PERMISSIONS.ACCOUNTS_READ,
    PERMISSIONS.TRANSACTIONS_READ,
    PERMISSIONS.BILLS_READ,
    PERMISSIONS.SPLITS_READ,
    PERMISSIONS.GOALS_READ,
    PERMISSIONS.EXPORTS_READ,
    PERMISSIONS.UPLOADS_READ,
    PERMISSIONS.CATEGORIES_READ,
    PERMISSIONS.TAGS_READ,
    PERMISSIONS.PAYMENT_METHODS_READ,
    PERMISSIONS.MERCHANTS_READ,
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.BUDGETS_READ,
    PERMISSIONS.CREDIT_CARDS_READ,
    PERMISSIONS.INVESTMENTS_READ,
  ]),
};

/** Roles from least to most powerful; a role may only manage roles below its own (owners: all). */
const HOUSEHOLD_ROLE_RANK: Readonly<Record<HouseholdRole, number>> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

/** The roles `actor` may give to someone (invite, or change a member to). */
export function getAssignableRoles(actor: HouseholdRole): HouseholdRole[] {
  if (actor === "owner") return ["owner", "admin", "member", "viewer"];
  if (actor === "admin") return ["member", "viewer"];
  return [];
}

export function canAssignRole(actor: HouseholdRole, role: HouseholdRole): boolean {
  return getAssignableRoles(actor).includes(role);
}

/**
 * Whether `actor` may change the role of, or remove, a member who currently has `target`.
 * Owners manage everyone (including themselves, with the last-owner rule enforced by the API);
 * admins manage only members and viewers; nobody else manages anyone, and nobody but an owner
 * changes their own role.
 */
export function canManageMember(
  actor: HouseholdRole,
  target: HouseholdRole,
  options: { self?: boolean } = {},
): boolean {
  if (actor === "owner") return true;
  if (options.self) return false;
  return actor === "admin" && HOUSEHOLD_ROLE_RANK[target] < HOUSEHOLD_ROLE_RANK[actor];
}

export function getPermissionsForRole(role: HouseholdRole): HouseholdPermission[] {
  return Array.from(HOUSEHOLD_ROLE_PERMISSIONS[role]);
}

export function hasHouseholdPermission(
  role: HouseholdRole,
  permission: HouseholdPermission,
): boolean {
  return HOUSEHOLD_ROLE_PERMISSIONS[role].has(permission);
}
