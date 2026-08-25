import type {
  HouseholdInviteStatus,
  HouseholdInviteStatusMetadata,
  HouseholdRole,
} from "@luraba/contracts"

export type { HouseholdInviteStatus, HouseholdInviteStatusMetadata }

export type StoredHouseholdInviteStatus = Exclude<
  HouseholdInviteStatus,
  "expired"
>

export interface HouseholdInviteInviter {
  id: string
  name: string
  email: string
  image: string | null
}

export interface HouseholdInvite {
  id: string
  householdId: string
  householdName: string
  email: string
  role: HouseholdRole
  status: StoredHouseholdInviteStatus
  computedStatus: HouseholdInviteStatus
  invitedByUserId: string
  inviter: HouseholdInviteInviter | null
  createdAt: string
  updatedAt: string
  expiresAt: string
  acceptedAt: string | null
  rejectedAt: string | null
  canceledAt: string | null
}

export interface HouseholdInvitePreview {
  email: string
  household: {
    name: string
  }
  role: HouseholdRole
  inviter: {
    name: string
    image: string | null
  } | null
  status: HouseholdInviteStatus
  expiresAt: string
}

export interface AcceptedHouseholdInvite {
  household: {
    id: string
    name: string
    role: HouseholdRole
  }
}

export interface HouseholdInviteLink {
  url: string
  expiresAt: string
}
