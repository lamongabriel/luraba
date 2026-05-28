import type { HouseholdRole } from '@/shared/validation/households';
export type { HouseholdRole };

export const HOUSEHOLD_PERMISSIONS = [
  'household.read',
  'household.update',
  'household.members.read',
  'household.members.manage',
  'household.invites.manage',
  'accounts.read',
  'accounts.create',
  'accounts.update',
  'accounts.delete',
  'transactions.read',
  'transactions.create',
  'transactions.update',
  'transactions.delete',
  'categories.read',
  'categories.create',
  'categories.update',
  'categories.delete',
  'merchants.read',
  'merchants.create',
  'merchants.update',
  'merchants.delete',
  'budgets.read',
  'budgets.update',
  'creditCards.read',
  'creditCards.create',
  'creditCards.update',
  'creditCards.delete',
] as const;

export type HouseholdPermission = (typeof HOUSEHOLD_PERMISSIONS)[number];

const allPermissions = new Set<HouseholdPermission>(HOUSEHOLD_PERMISSIONS);

export const HOUSEHOLD_ROLE_PERMISSIONS: Record<HouseholdRole, ReadonlySet<HouseholdPermission>> = {
  owner: allPermissions,
  admin: new Set(HOUSEHOLD_PERMISSIONS.filter((permission) => permission !== 'household.update')),
  member: new Set([
    'household.read',
    'accounts.read',
    'accounts.create',
    'transactions.read',
    'transactions.create',
    'categories.read',
    'merchants.read',
    'budgets.read',
    'creditCards.read',
  ]),
  viewer: new Set([
    'household.read',
    'accounts.read',
    'transactions.read',
    'categories.read',
    'merchants.read',
    'budgets.read',
    'creditCards.read',
  ]),
};

export type HouseholdContext = {
  householdId: string;
  userId: string;
  role: HouseholdRole;
  permissions: HouseholdPermission[];
};

export function getPermissionsForRole(role: HouseholdRole): HouseholdPermission[] {
  return Array.from(HOUSEHOLD_ROLE_PERMISSIONS[role]);
}

export function hasHouseholdPermission(role: HouseholdRole, permission: HouseholdPermission): boolean {
  return HOUSEHOLD_ROLE_PERMISSIONS[role].has(permission);
}
