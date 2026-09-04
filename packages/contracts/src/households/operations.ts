import type { EndpointBody, EndpointParams, EndpointQuery, EndpointResult } from "../api.js";
import type { householdsEndpoints } from "./endpoints.js";

export type {
  CreateHouseholdInput,
  CreateHouseholdInviteInput,
  ListHouseholdInvitesQuery,
  ListHouseholdMembersQuery,
  ListHouseholdsQuery,
  ListMyHouseholdInvitesQuery,
  UpdateHouseholdInput,
  UpdateHouseholdMemberInput,
} from "./requests.js";

export type GetHouseholdParams = EndpointParams<typeof householdsEndpoints.get>;
export type UpdateHouseholdParams = EndpointParams<typeof householdsEndpoints.update>;
export type ListHouseholdMembersParams = EndpointParams<typeof householdsEndpoints.members>;
export type UpdateHouseholdMemberParams = EndpointParams<typeof householdsEndpoints.updateMember>;
export type ListHouseholdInvitesParams = EndpointParams<typeof householdsEndpoints.invites>;
export type CreateHouseholdInviteParams = EndpointParams<typeof householdsEndpoints.createInvite>;
export type PreviewHouseholdInviteQuery = EndpointQuery<typeof householdsEndpoints.previewInvite>;
export type AcceptHouseholdInviteInput = EndpointBody<typeof householdsEndpoints.acceptInvite>;
export type AcceptHouseholdInviteByIdParams = EndpointParams<
  typeof householdsEndpoints.acceptInviteById
>;
export type RejectHouseholdInviteByIdParams = EndpointParams<
  typeof householdsEndpoints.rejectInviteById
>;
export type RefreshHouseholdInviteLinkParams = EndpointParams<
  typeof householdsEndpoints.refreshInviteLink
>;
export type ResendHouseholdInviteParams = EndpointParams<typeof householdsEndpoints.resendInvite>;
export type CancelHouseholdInviteParams = EndpointParams<typeof householdsEndpoints.cancelInvite>;

export type ListHouseholdsResult = EndpointResult<typeof householdsEndpoints.list>;
export type CreateHouseholdResult = EndpointResult<typeof householdsEndpoints.create>;
export type ListHouseholdRolesResult = EndpointResult<typeof householdsEndpoints.roles>;
export type ListHouseholdPermissionsResult = EndpointResult<typeof householdsEndpoints.permissions>;
export type ListHouseholdInviteStatusesResult = EndpointResult<
  typeof householdsEndpoints.inviteStatuses
>;
export type PreviewHouseholdInviteResult = EndpointResult<typeof householdsEndpoints.previewInvite>;
export type ListMyHouseholdInvitesResult = EndpointResult<typeof householdsEndpoints.myInvites>;
export type AcceptHouseholdInviteResult = EndpointResult<typeof householdsEndpoints.acceptInvite>;
export type RejectHouseholdInviteResult = EndpointResult<typeof householdsEndpoints.rejectInvite>;
export type AcceptHouseholdInviteByIdResult = EndpointResult<
  typeof householdsEndpoints.acceptInviteById
>;
export type RejectHouseholdInviteByIdResult = EndpointResult<
  typeof householdsEndpoints.rejectInviteById
>;
export type GetHouseholdResult = EndpointResult<typeof householdsEndpoints.get>;
export type UpdateHouseholdResult = EndpointResult<typeof householdsEndpoints.update>;
export type ListHouseholdMembersResult = EndpointResult<typeof householdsEndpoints.members>;
export type UpdateHouseholdMemberResult = EndpointResult<typeof householdsEndpoints.updateMember>;
export type RemoveHouseholdMemberResult = EndpointResult<typeof householdsEndpoints.removeMember>;
export type ListHouseholdInvitesResult = EndpointResult<typeof householdsEndpoints.invites>;
export type CreateHouseholdInviteResult = EndpointResult<typeof householdsEndpoints.createInvite>;
export type RefreshHouseholdInviteLinkResult = EndpointResult<
  typeof householdsEndpoints.refreshInviteLink
>;
export type DeleteHouseholdResult = EndpointResult<typeof householdsEndpoints.delete>;
export type ResendHouseholdInviteResult = EndpointResult<typeof householdsEndpoints.resendInvite>;
export type CancelHouseholdInviteResult = EndpointResult<typeof householdsEndpoints.cancelInvite>;
