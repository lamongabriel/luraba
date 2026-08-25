import { PERMISSIONS } from "@luraba/contracts"

export { PERMISSIONS }

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]
export type PermissionMatch = "any" | "all"
export type PermissionInput = PermissionKey | readonly PermissionKey[]
