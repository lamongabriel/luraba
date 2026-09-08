import { householdsEndpoints } from "@luraba/contracts/households";
import { createAuthenticatedHandler } from "@/shared/controllers/authenticated.controller";
import { createHandler } from "@/shared/controllers/controller";
import { createHouseholdHandler } from "@/shared/controllers/household.controller";
import { withApiMeta } from "@/shared/response";
import {
  listHouseholdInviteStatuses,
  listHouseholdPermissions,
  listHouseholdRoles,
} from "./households.access";
import * as householdsService from "./households.service";

export const list = createAuthenticatedHandler({
  query: householdsEndpoints.list.query,
  response: householdsEndpoints.list.response,
  meta: householdsEndpoints.list.meta,
  handle: async ({ user, query }) => {
    const result = await householdsService.listHouseholds(user.id, query);
    return withApiMeta(result.data, result.meta);
  },
});

export const create = createAuthenticatedHandler({
  body: householdsEndpoints.create.body,
  response: householdsEndpoints.create.response,
  handle: ({ user, body }) => householdsService.createHousehold(user.id, body),
  status: "created",
});

export const listRoles = createAuthenticatedHandler({
  response: householdsEndpoints.roles.response,
  handle: async () => listHouseholdRoles(),
});

export const listPermissions = createAuthenticatedHandler({
  response: householdsEndpoints.permissions.response,
  handle: async () => listHouseholdPermissions(),
});

export const listInviteStatuses = createAuthenticatedHandler({
  response: householdsEndpoints.inviteStatuses.response,
  handle: async () => listHouseholdInviteStatuses(),
});

export const get = createHouseholdHandler({
  params: householdsEndpoints.get.params,
  response: householdsEndpoints.get.response,
  handle: ({ household, params }) => householdsService.getHousehold(household, params.id),
});

export const remove = createHouseholdHandler({
  params: householdsEndpoints.delete.params,
  handle: ({ household, params }) => householdsService.deleteHousehold(household, params.id),
  status: "no-content",
});

export const update = createHouseholdHandler({
  params: householdsEndpoints.update.params,
  body: householdsEndpoints.update.body,
  response: householdsEndpoints.update.response,
  handle: ({ household, params, body }) =>
    householdsService.updateHousehold(household, params.id, body),
});

export const listMembers = createHouseholdHandler({
  params: householdsEndpoints.members.params,
  query: householdsEndpoints.members.query,
  response: householdsEndpoints.members.response,
  meta: householdsEndpoints.members.meta,
  handle: async ({ household, params, query }) => {
    const result = await householdsService.listMembers(household, params.id, query);
    return withApiMeta(result.data, result.meta);
  },
});

export const updateMember = createHouseholdHandler({
  params: householdsEndpoints.updateMember.params,
  body: householdsEndpoints.updateMember.body,
  response: householdsEndpoints.updateMember.response,
  handle: ({ household, params, body }) =>
    householdsService.updateMemberRole(household, params.id, params.userId, body),
});

export const removeMember = createHouseholdHandler({
  params: householdsEndpoints.removeMember.params,
  handle: ({ household, params }) =>
    householdsService.removeMember(household, params.id, params.userId),
  status: "no-content",
});

export const createInvite = createHouseholdHandler({
  params: householdsEndpoints.createInvite.params,
  body: householdsEndpoints.createInvite.body,
  response: householdsEndpoints.createInvite.response,
  handle: ({ household, params, body }) =>
    householdsService.createInvite(household, params.id, body),
  status: "created",
});

export const listHouseholdInvites = createHouseholdHandler({
  params: householdsEndpoints.invites.params,
  query: householdsEndpoints.invites.query,
  response: householdsEndpoints.invites.response,
  meta: householdsEndpoints.invites.meta,
  handle: async ({ household, params, query }) => {
    const result = await householdsService.listHouseholdInvites(household, params.id, query);
    return withApiMeta(result.data, result.meta);
  },
});

export const listMyInvites = createAuthenticatedHandler({
  query: householdsEndpoints.myInvites.query,
  response: householdsEndpoints.myInvites.response,
  meta: householdsEndpoints.myInvites.meta,
  handle: async ({ user, query }) => {
    const result = await householdsService.listMyPendingInvites(user.email, query);
    return withApiMeta(result.data, result.meta);
  },
});

export const previewInvite = createHandler({
  query: householdsEndpoints.previewInvite.query,
  response: householdsEndpoints.previewInvite.response,
  handle: ({ query }) => householdsService.previewInvite(query.token),
});

export const acceptInvite = createAuthenticatedHandler({
  body: householdsEndpoints.acceptInvite.body,
  response: householdsEndpoints.acceptInvite.response,
  handle: ({ user, body }) => householdsService.acceptInvite(user.id, user.email, body.token),
});

export const rejectInvite = createAuthenticatedHandler({
  body: householdsEndpoints.rejectInvite.body,
  handle: ({ user, body }) => householdsService.rejectInvite(user.email, body.token),
  status: "no-content",
});

export const acceptInviteById = createAuthenticatedHandler({
  params: householdsEndpoints.acceptInviteById.params,
  response: householdsEndpoints.acceptInviteById.response,
  handle: ({ user, params }) =>
    householdsService.acceptInviteById(user.id, user.email, params.inviteId),
});

export const rejectInviteById = createAuthenticatedHandler({
  params: householdsEndpoints.rejectInviteById.params,
  handle: ({ user, params }) => householdsService.rejectInviteById(user.email, params.inviteId),
  status: "no-content",
});

export const refreshInviteLink = createHouseholdHandler({
  params: householdsEndpoints.refreshInviteLink.params,
  response: householdsEndpoints.refreshInviteLink.response,
  handle: ({ household, params }) =>
    householdsService.refreshInviteLink(household, params.id, params.inviteId),
});

export const resendInvite = createHouseholdHandler({
  params: householdsEndpoints.resendInvite.params,
  handle: ({ household, params }) =>
    householdsService.resendInvite(household, params.id, params.inviteId),
  status: "no-content",
});

export const cancelInvite = createHouseholdHandler({
  params: householdsEndpoints.cancelInvite.params,
  handle: ({ household, params }) =>
    householdsService.cancelInvite(household, params.id, params.inviteId),
  status: "no-content",
});
