import {
  HOUSEHOLD_ROLE_PERMISSIONS,
  type HouseholdPermission,
  type HouseholdRole,
  PERMISSIONS,
} from "@luraba/contracts";

/**
 * How permissions are shown to people: grouped by what they apply to, each with the same four
 * actions. The policy itself (which role gets what) lives in `@luraba/contracts`; this file only
 * names and groups it, so the roles page, the invite preview and the role-change dialog all read
 * the same catalog.
 */

export type PermissionAction = "view" | "create" | "edit" | "delete" | "manage";

export const PERMISSION_ACTION_LABELS: Record<PermissionAction, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  manage: "Manage",
};

const ACTION_BY_SUFFIX: Record<string, PermissionAction> = {
  read: "view",
  create: "create",
  update: "edit",
  write: "edit",
  delete: "delete",
  manage: "manage",
};

export function getPermissionAction(permission: HouseholdPermission): PermissionAction {
  const suffix = permission.split(".").at(-1) ?? "";
  return ACTION_BY_SUFFIX[suffix] ?? "manage";
}

export type PermissionGroup = {
  key: string;
  label: string;
  /** One line on what this area is. */
  description: string;
  permissions: readonly HouseholdPermission[];
};

const P = PERMISSIONS;

export const PERMISSION_GROUPS: readonly PermissionGroup[] = [
  {
    key: "household",
    label: "Household settings",
    description: "Name, picture, currency and budget rules of the household.",
    permissions: [P.HOUSEHOLD_READ, P.HOUSEHOLD_UPDATE, P.HOUSEHOLD_DELETE],
  },
  {
    key: "members",
    label: "Members and roles",
    description: "Who is in the household and what role they have.",
    permissions: [P.HOUSEHOLD_MEMBERS_READ, P.HOUSEHOLD_MEMBERS_MANAGE],
  },
  {
    key: "invites",
    label: "Invitations",
    description: "Inviting people and cancelling invitations.",
    permissions: [P.HOUSEHOLD_INVITES_MANAGE],
  },
  {
    key: "accounts",
    label: "Accounts",
    description: "Bank, cash and other accounts and their balances.",
    permissions: [P.ACCOUNTS_READ, P.ACCOUNTS_CREATE, P.ACCOUNTS_UPDATE, P.ACCOUNTS_DELETE],
  },
  {
    key: "creditCards",
    label: "Credit cards",
    description: "Cards, statements and invoices.",
    permissions: [
      P.CREDIT_CARDS_READ,
      P.CREDIT_CARDS_CREATE,
      P.CREDIT_CARDS_UPDATE,
      P.CREDIT_CARDS_DELETE,
    ],
  },
  {
    key: "transactions",
    label: "Transactions",
    description: "Income, expenses and transfers.",
    permissions: [
      P.TRANSACTIONS_READ,
      P.TRANSACTIONS_CREATE,
      P.TRANSACTIONS_UPDATE,
      P.TRANSACTIONS_DELETE,
    ],
  },
  {
    key: "bills",
    label: "Bills",
    description: "Recurring bills and their payments.",
    permissions: [P.BILLS_READ, P.BILLS_CREATE, P.BILLS_UPDATE, P.BILLS_DELETE],
  },
  {
    key: "budgets",
    label: "Budgets",
    description: "Monthly budget plan.",
    permissions: [P.BUDGETS_READ, P.BUDGETS_UPDATE],
  },
  {
    key: "goals",
    label: "Goals",
    description: "Savings goals and contributions.",
    permissions: [P.GOALS_READ, P.GOALS_CREATE, P.GOALS_UPDATE, P.GOALS_DELETE],
  },
  {
    key: "splits",
    label: "Splits",
    description: "Shared expenses and who owes what.",
    permissions: [P.SPLITS_READ, P.SPLITS_CREATE, P.SPLITS_UPDATE, P.SPLITS_DELETE],
  },
  {
    key: "investments",
    label: "Investments",
    description: "Portfolios, holdings and investment activity.",
    permissions: [P.INVESTMENTS_READ, P.INVESTMENTS_WRITE, P.INVESTMENTS_DELETE],
  },
  {
    key: "categories",
    label: "Categories",
    description: "How spending and income are grouped.",
    permissions: [P.CATEGORIES_READ, P.CATEGORIES_CREATE, P.CATEGORIES_UPDATE, P.CATEGORIES_DELETE],
  },
  {
    key: "tags",
    label: "Tags",
    description: "Labels for finding transactions.",
    permissions: [P.TAGS_READ, P.TAGS_CREATE, P.TAGS_UPDATE, P.TAGS_DELETE],
  },
  {
    key: "merchants",
    label: "Merchants",
    description: "The shops and services you pay.",
    permissions: [P.MERCHANTS_READ, P.MERCHANTS_CREATE, P.MERCHANTS_UPDATE, P.MERCHANTS_DELETE],
  },
  {
    key: "products",
    label: "Products",
    description: "Items inside transactions.",
    permissions: [P.PRODUCTS_READ, P.PRODUCTS_CREATE, P.PRODUCTS_UPDATE, P.PRODUCTS_DELETE],
  },
  {
    key: "paymentMethods",
    label: "Payment methods",
    description: "How transactions were paid.",
    permissions: [
      P.PAYMENT_METHODS_READ,
      P.PAYMENT_METHODS_CREATE,
      P.PAYMENT_METHODS_UPDATE,
      P.PAYMENT_METHODS_DELETE,
    ],
  },
  {
    key: "imports",
    label: "Imports",
    description: "Importing statements into the household.",
    permissions: [P.IMPORTS_READ, P.IMPORTS_CREATE, P.IMPORTS_DELETE],
  },
  {
    key: "exports",
    label: "Exports",
    description: "Downloading household data.",
    permissions: [P.EXPORTS_READ],
  },
  {
    key: "uploads",
    label: "Files",
    description: "Receipts, pictures and documents.",
    permissions: [P.UPLOADS_READ, P.UPLOADS_CREATE, P.UPLOADS_DELETE],
  },
  {
    key: "integrations",
    label: "Integrations",
    description: "Connected services.",
    permissions: [P.INTEGRATIONS_READ, P.INTEGRATIONS_UPDATE, P.INTEGRATIONS_DELETE],
  },
];

/** What a permission lets someone do, in plain words (used as tooltips and in diffs). */
const SPECIAL_DESCRIPTIONS: Partial<Record<HouseholdPermission, string>> = {
  [P.HOUSEHOLD_READ]: "See the household and its dashboard",
  [P.HOUSEHOLD_UPDATE]: "Change the household's name, picture, currency and budget rules",
  [P.HOUSEHOLD_DELETE]: "Delete the household and everything in it",
  [P.HOUSEHOLD_MEMBERS_READ]: "See who is in the household",
  [P.HOUSEHOLD_MEMBERS_MANAGE]: "Change members' roles and remove them",
  [P.HOUSEHOLD_INVITES_MANAGE]: "Invite people, resend and cancel invitations",
  [P.INVESTMENTS_WRITE]: "Create and edit portfolios, assets and investment activity",
};

const groupByPermission = new Map<HouseholdPermission, PermissionGroup>(
  PERMISSION_GROUPS.flatMap((group) =>
    group.permissions.map((permission) => [permission, group] as const),
  ),
);

export function describePermission(permission: HouseholdPermission): string {
  const special = SPECIAL_DESCRIPTIONS[permission];
  if (special) return special;
  const group = groupByPermission.get(permission);
  const action = PERMISSION_ACTION_LABELS[getPermissionAction(permission)];
  return `${action} ${(group?.label ?? permission).toLowerCase()}`;
}

export function roleHasPermission(role: HouseholdRole, permission: HouseholdPermission): boolean {
  return HOUSEHOLD_ROLE_PERMISSIONS[role].has(permission);
}

export type RolePermissionDiff = { gained: HouseholdPermission[]; lost: HouseholdPermission[] };

/** What changes for someone moving from one role to another. */
export function diffRoles(from: HouseholdRole, to: HouseholdRole): RolePermissionDiff {
  const all = PERMISSION_GROUPS.flatMap((group) => group.permissions);
  return {
    gained: all.filter((p) => !roleHasPermission(from, p) && roleHasPermission(to, p)),
    lost: all.filter((p) => roleHasPermission(from, p) && !roleHasPermission(to, p)),
  };
}

export function countRolePermissions(role: HouseholdRole): number {
  return HOUSEHOLD_ROLE_PERMISSIONS[role].size;
}

export const TOTAL_PERMISSIONS = Object.keys(PERMISSIONS).length;
