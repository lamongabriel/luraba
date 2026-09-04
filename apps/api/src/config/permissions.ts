import { type HouseholdPermission, type HouseholdRole, PERMISSIONS } from '@luraba/contracts';
import type {
  CreditExpenseTiming,
  CreditInstallmentBudgetMode,
  Timezone,
} from '@/shared/validation/preferences';

export type { HouseholdPermission, HouseholdRole } from '@luraba/contracts';
export { HOUSEHOLD_ROLE_METADATA, PERMISSIONS } from '@luraba/contracts';

const allPermissions = new Set<HouseholdPermission>(Object.values(PERMISSIONS));

export const HOUSEHOLD_ROLE_PERMISSIONS: Record<HouseholdRole, ReadonlySet<HouseholdPermission>> = {
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

export type HouseholdContext = {
  householdId: string;
  userId: string;
  role: HouseholdRole;
  permissions: HouseholdPermission[];
  timezone: Timezone;
  creditExpenseTiming: CreditExpenseTiming;
  creditInstallmentBudgetMode: CreditInstallmentBudgetMode;
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
