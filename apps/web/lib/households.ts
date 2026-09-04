import type {
  HouseholdInviteStatus,
  HouseholdInviteStatusMetadata,
  HouseholdPermission,
  HouseholdPermissionMetadata,
  HouseholdRole,
  HouseholdRoleMetadata,
} from "@luraba/contracts"

export function getHouseholdRoleMetadata(
  role: HouseholdRole,
  roles: readonly HouseholdRoleMetadata[] = [],
) {
  return roles.find((option) => option.value === role)
}

export function getHouseholdRoleLabel(
  role: HouseholdRole,
  roles: readonly HouseholdRoleMetadata[] = [],
) {
  return getHouseholdRoleMetadata(role, roles)?.label ?? role
}

export function getHouseholdRoleDescription(
  role: HouseholdRole,
  roles: readonly HouseholdRoleMetadata[] = [],
) {
  return getHouseholdRoleMetadata(role, roles)?.description ?? ""
}

export function getHouseholdInviteStatusLabel(
  status: HouseholdInviteStatus,
  statuses: readonly HouseholdInviteStatusMetadata[] = [],
) {
  return statuses.find((option) => option.value === status)?.label ?? status
}

export function canManageHousehold(
  role: HouseholdRole,
  roles: readonly HouseholdRoleMetadata[] = [],
) {
  return (
    getHouseholdRoleMetadata(role, roles)?.permissions.includes(
      "household.members.manage",
    ) === true
  )
}

export function hasHouseholdRolePermission(
  role: HouseholdRole,
  permission: HouseholdPermission,
  roles: readonly HouseholdRoleMetadata[] = [],
) {
  return (
    getHouseholdRoleMetadata(role, roles)?.permissions.includes(permission) ===
    true
  )
}

export function getHouseholdPermissionMetadata(
  permission: HouseholdPermission,
  permissions: readonly HouseholdPermissionMetadata[] = [],
) {
  return permissions.find((option) => option.value === permission)
}

export function getHouseholdInviteStatusClassName(
  status: HouseholdInviteStatus,
) {
  if (status === "accepted")
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
  if (status === "pending")
    return "border-blue-500/30 bg-blue-500/10 text-blue-600"
  if (status === "expired" || status === "rejected") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700"
  }
  return "border-border bg-muted text-muted-foreground"
}
