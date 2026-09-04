import type {
  householdInvitesTable,
  householdMembersTable,
  householdsTable,
} from '@/db/schemas/households.schema';

/** Database records remain API-local. HTTP schemas and resources live in contracts. */
export type HouseholdRecord = typeof householdsTable.$inferSelect;
export type HouseholdMemberRecord = typeof householdMembersTable.$inferSelect;
export type HouseholdInviteRecord = typeof householdInvitesTable.$inferSelect;
