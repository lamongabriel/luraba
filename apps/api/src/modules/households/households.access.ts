import {
  householdInviteStatusMetadataSchema,
  householdPermissionMetadataSchema,
  householdRoleMetadataSchema,
} from '@luraba/contracts';
import { z } from 'zod';
import {
  HOUSEHOLD_PERMISSIONS,
  HOUSEHOLD_ROLE_METADATA,
  HOUSEHOLD_ROLE_PERMISSIONS,
  type HouseholdPermission,
} from '@/config/permissions';
import { householdRoleSchema } from '@/shared/validation/households';
import { householdInviteComputedStatusSchema } from './households.query';

const inviteStatusDefinitions = {
  pending: {
    label: 'Pending',
    description: 'The invitation is waiting for the recipient.',
  },
  accepted: {
    label: 'Accepted',
    description: 'The recipient joined the household.',
  },
  expired: {
    label: 'Expired',
    description: 'The invitation link is no longer valid.',
  },
  rejected: {
    label: 'Rejected',
    description: 'The recipient declined the invitation.',
  },
  canceled: {
    label: 'Canceled',
    description: 'The invitation was canceled by a household manager.',
  },
} as const;

const permissionActionLabels = {
  read: 'View',
  create: 'Create',
  update: 'Manage',
  delete: 'Delete',
  manage: 'Manage',
} as const;

const permissionActionDescriptions = {
  read: 'View household data.',
  create: 'Create household data.',
  update: 'Update household data.',
  delete: 'Delete household data.',
  manage: 'Manage household access.',
} as const;

function humanizePermissionResource(resource: string): string {
  return resource
    .replaceAll('.', ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^[a-z]/, (character) => character.toUpperCase());
}

function permissionMetadata(permission: HouseholdPermission) {
  const parts = permission.split('.');
  const action = parts.pop() as keyof typeof permissionActionLabels;
  const resource = parts.join('.');
  const resourceLabel = humanizePermissionResource(resource);

  return {
    value: permission,
    label: `${permissionActionLabels[action]} ${resourceLabel}`,
    group: resourceLabel,
    description: permissionActionDescriptions[action],
  };
}

export const ListHouseholdPermissionsResponseSchema = z.array(householdPermissionMetadataSchema);

export const ListHouseholdRolesResponseSchema = z.array(householdRoleMetadataSchema);

export const ListHouseholdInviteStatusesResponseSchema = z.array(
  householdInviteStatusMetadataSchema,
);

export type HouseholdPermissionMetadata = z.infer<typeof householdPermissionMetadataSchema>;
export type HouseholdRoleMetadata = z.infer<typeof householdRoleMetadataSchema>;
export type HouseholdInviteStatusMetadata = z.infer<typeof householdInviteStatusMetadataSchema>;

export function listHouseholdPermissions(): HouseholdPermissionMetadata[] {
  return HOUSEHOLD_PERMISSIONS.map(permissionMetadata);
}

export function listHouseholdRoles(): HouseholdRoleMetadata[] {
  return householdRoleSchema.options.map((role) => ({
    value: role,
    ...HOUSEHOLD_ROLE_METADATA[role],
    permissions: Array.from(HOUSEHOLD_ROLE_PERMISSIONS[role]),
  }));
}

export function listHouseholdInviteStatuses(): HouseholdInviteStatusMetadata[] {
  return householdInviteComputedStatusSchema.options.map((status) => ({
    value: status,
    label: inviteStatusDefinitions[status].label,
    description: inviteStatusDefinitions[status].description,
  }));
}
