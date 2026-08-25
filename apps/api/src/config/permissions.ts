import {
  HOUSEHOLD_PERMISSIONS,
  type HouseholdPermission,
  type HouseholdRole,
} from '@luraba/contracts';
import type {
  CreditExpenseTiming,
  CreditInstallmentBudgetMode,
  Timezone,
} from '@/shared/validation/preferences';

export type { HouseholdPermission, HouseholdRole } from '@luraba/contracts';
export { HOUSEHOLD_PERMISSIONS, HOUSEHOLD_ROLE_METADATA } from '@luraba/contracts';

const allPermissions = new Set<HouseholdPermission>(HOUSEHOLD_PERMISSIONS);

export const HOUSEHOLD_ROLE_PERMISSIONS: Record<HouseholdRole, ReadonlySet<HouseholdPermission>> = {
  owner: allPermissions,
  admin: new Set(
    HOUSEHOLD_PERMISSIONS.filter(
      (permission) => permission !== 'household.update' && permission !== 'household.delete',
    ),
  ),
  member: new Set([
    'household.read',
    'accounts.read',
    'accounts.create',
    'transactions.read',
    'transactions.create',
    'categories.read',
    'tags.read',
    'paymentMethods.read',
    'paymentMethods.create',
    'merchants.read',
    'budgets.read',
    'creditCards.read',
    'recurringBills.read',
    'recurringBills.update',
    'recurringBills.delete',
  ]),
  viewer: new Set([
    'household.read',
    'accounts.read',
    'transactions.read',
    'categories.read',
    'tags.read',
    'paymentMethods.read',
    'merchants.read',
    'budgets.read',
    'creditCards.read',
    'recurringBills.read',
    'recurringBills.create',
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
