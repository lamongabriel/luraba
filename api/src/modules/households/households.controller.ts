import { createAuthenticatedHandler } from '@/shared/controllers/authenticated.controller';
import { createHandler } from '@/shared/controllers/controller';
import { createHouseholdHandler } from '@/shared/controllers/household.controller';
import { withApiMeta } from '@/shared/response';
import {
  ListHouseholdInvitesRequestQuerySchema,
  ListHouseholdMembersRequestQuerySchema,
  ListHouseholdsRequestQuerySchema,
  ListMyHouseholdInvitesRequestQuerySchema,
} from './households.query';
import * as householdsService from './households.service';
import {
  AcceptHouseholdInviteResponseSchema,
  CreateHouseholdInviteRequestBodySchema,
  CreateHouseholdInviteRequestParamsSchema,
  CreateHouseholdInviteResponseSchema,
  CreateHouseholdRequestBodySchema,
  CreateHouseholdResponseSchema,
  HouseholdInviteIdRequestParamsSchema,
  HouseholdInviteLinkResponseSchema,
  HouseholdInviteTokenRequestBodySchema,
  ListHouseholdInvitesRequestParamsSchema,
  ListHouseholdInvitesResponseSchema,
  ListHouseholdMembersRequestParamsSchema,
  ListHouseholdMembersResponseSchema,
  ListHouseholdsResponseSchema,
  ListMyHouseholdInvitesResponseSchema,
  ManageHouseholdInviteRequestParamsSchema,
  PreviewHouseholdInviteRequestQuerySchema,
  PreviewHouseholdInviteResponseSchema,
  RemoveHouseholdMemberRequestParamsSchema,
  UpdateHouseholdMemberRequestBodySchema,
  UpdateHouseholdMemberRequestParamsSchema,
  UpdateHouseholdMemberResponseSchema,
  UpdateHouseholdRequestBodySchema,
  UpdateHouseholdRequestParamsSchema,
  UpdateHouseholdResponseSchema,
} from './households.types';

export const list = createAuthenticatedHandler({
  query: ListHouseholdsRequestQuerySchema,
  response: ListHouseholdsResponseSchema,
  handle: async ({ user, query }) => {
    const result = await householdsService.listHouseholds(user.id, query);
    return withApiMeta(result.data, result.meta);
  },
});

export const create = createAuthenticatedHandler({
  body: CreateHouseholdRequestBodySchema,
  response: CreateHouseholdResponseSchema,
  handle: ({ user, body }) => householdsService.createHousehold(user.id, body),
  status: 'created',
});

export const get = createHouseholdHandler({
  params: UpdateHouseholdRequestParamsSchema,
  response: UpdateHouseholdResponseSchema,
  handle: ({ household, params }) => householdsService.getHousehold(household, params.id),
});

export const remove = createHouseholdHandler({
  params: UpdateHouseholdRequestParamsSchema,
  handle: ({ household, params }) => householdsService.deleteHousehold(household, params.id),
  status: 'no-content',
});

export const update = createHouseholdHandler({
  params: UpdateHouseholdRequestParamsSchema,
  body: UpdateHouseholdRequestBodySchema,
  response: UpdateHouseholdResponseSchema,
  handle: ({ household, params, body }) =>
    householdsService.updateHousehold(household, params.id, body),
});

export const listMembers = createHouseholdHandler({
  params: ListHouseholdMembersRequestParamsSchema,
  query: ListHouseholdMembersRequestQuerySchema,
  response: ListHouseholdMembersResponseSchema,
  handle: async ({ household, params, query }) => {
    const result = await householdsService.listMembers(household, params.id, query);
    return withApiMeta(result.data, result.meta);
  },
});

export const updateMember = createHouseholdHandler({
  params: UpdateHouseholdMemberRequestParamsSchema,
  body: UpdateHouseholdMemberRequestBodySchema,
  response: UpdateHouseholdMemberResponseSchema,
  handle: ({ household, params, body }) =>
    householdsService.updateMemberRole(household, params.id, params.userId, body),
});

export const removeMember = createHouseholdHandler({
  params: RemoveHouseholdMemberRequestParamsSchema,
  handle: ({ household, params }) =>
    householdsService.removeMember(household, params.id, params.userId),
  status: 'no-content',
});

export const createInvite = createHouseholdHandler({
  params: CreateHouseholdInviteRequestParamsSchema,
  body: CreateHouseholdInviteRequestBodySchema,
  response: CreateHouseholdInviteResponseSchema,
  handle: ({ household, params, body }) =>
    householdsService.createInvite(household, params.id, body),
  status: 'created',
});

export const listHouseholdInvites = createHouseholdHandler({
  params: ListHouseholdInvitesRequestParamsSchema,
  query: ListHouseholdInvitesRequestQuerySchema,
  response: ListHouseholdInvitesResponseSchema,
  handle: async ({ household, params, query }) => {
    const result = await householdsService.listHouseholdInvites(household, params.id, query);
    return withApiMeta(result.data, result.meta);
  },
});

export const listMyInvites = createAuthenticatedHandler({
  query: ListMyHouseholdInvitesRequestQuerySchema,
  response: ListMyHouseholdInvitesResponseSchema,
  handle: async ({ user, query }) => {
    const result = await householdsService.listMyPendingInvites(user.email, query);
    return withApiMeta(result.data, result.meta);
  },
});

export const previewInvite = createHandler({
  query: PreviewHouseholdInviteRequestQuerySchema,
  response: PreviewHouseholdInviteResponseSchema,
  handle: ({ query }) => householdsService.previewInvite(query.token),
});

export const acceptInvite = createAuthenticatedHandler({
  body: HouseholdInviteTokenRequestBodySchema,
  response: AcceptHouseholdInviteResponseSchema,
  handle: ({ user, body }) => householdsService.acceptInvite(user.id, user.email, body.token),
});

export const rejectInvite = createAuthenticatedHandler({
  body: HouseholdInviteTokenRequestBodySchema,
  handle: ({ user, body }) => householdsService.rejectInvite(user.email, body.token),
  status: 'no-content',
});

export const acceptInviteById = createAuthenticatedHandler({
  params: HouseholdInviteIdRequestParamsSchema,
  response: AcceptHouseholdInviteResponseSchema,
  handle: ({ user, params }) =>
    householdsService.acceptInviteById(user.id, user.email, params.inviteId),
});

export const rejectInviteById = createAuthenticatedHandler({
  params: HouseholdInviteIdRequestParamsSchema,
  handle: ({ user, params }) => householdsService.rejectInviteById(user.email, params.inviteId),
  status: 'no-content',
});

export const refreshInviteLink = createHouseholdHandler({
  params: ManageHouseholdInviteRequestParamsSchema,
  response: HouseholdInviteLinkResponseSchema,
  handle: ({ household, params }) =>
    householdsService.refreshInviteLink(household, params.id, params.inviteId),
});

export const resendInvite = createHouseholdHandler({
  params: ManageHouseholdInviteRequestParamsSchema,
  handle: ({ household, params }) =>
    householdsService.resendInvite(household, params.id, params.inviteId),
  status: 'no-content',
});

export const cancelInvite = createHouseholdHandler({
  params: ManageHouseholdInviteRequestParamsSchema,
  handle: ({ household, params }) =>
    householdsService.cancelInvite(household, params.id, params.inviteId),
  status: 'no-content',
});
