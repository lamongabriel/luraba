import type { BaseListHttpQuery, ListResponse } from "@/interfaces/api"
import type { HouseholdRole } from "@/interfaces/household"
import type {
  AcceptedHouseholdInvite,
  HouseholdInvite,
  HouseholdInviteLink,
  HouseholdInvitePreview,
  HouseholdInviteStatus,
} from "@/interfaces/household-invite"

export type PreviewHouseholdInviteHttpResponse = HouseholdInvitePreview
export type HouseholdInviteSortField =
  | "acceptedAt"
  | "createdAt"
  | "email"
  | "expiresAt"
  | "householdName"
  | "role"
  | "rejectedAt"
  | "canceledAt"
  | "status"
  | "updatedAt"

export interface ListHouseholdInvitesHttpQuery
  extends BaseListHttpQuery<HouseholdInviteSortField> {
  roles?: HouseholdRole[]
  statuses?: HouseholdInviteStatus[]
  createdAtFrom?: string
  createdAtTo?: string
  updatedAtFrom?: string
  updatedAtTo?: string
  expiresAtFrom?: string
  expiresAtTo?: string
  acceptedAtFrom?: string
  acceptedAtTo?: string
  rejectedAtFrom?: string
  rejectedAtTo?: string
  canceledAtFrom?: string
  canceledAtTo?: string
}

export interface ListMyHouseholdInvitesHttpQuery
  extends ListHouseholdInvitesHttpQuery {
  householdIds?: string[]
}

export type ListHouseholdInvitesHttpResponse = ListResponse<HouseholdInvite>
export type ListMyHouseholdInvitesHttpResponse = ListResponse<HouseholdInvite>
export interface CreateHouseholdInviteHttpBody {
  email: string
  role?: Exclude<HouseholdRole, "owner">
}
export type CreateHouseholdInviteHttpResponse = HouseholdInvite
export type AcceptHouseholdInviteHttpResponse = AcceptedHouseholdInvite
export type RefreshHouseholdInviteLinkHttpResponse = HouseholdInviteLink
