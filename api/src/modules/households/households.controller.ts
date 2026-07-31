import { createAuthenticatedHandler } from '@/shared/controllers/authenticated.controller';
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
  AcceptHouseholdInviteRequestParamsSchema,
  CreateHouseholdInviteRequestBodySchema,
  CreateHouseholdInviteRequestParamsSchema,
  CreateHouseholdInviteResponseSchema,
  CreateHouseholdRequestBodySchema,
  CreateHouseholdResponseSchema,
  ListHouseholdInvitesRequestParamsSchema,
  ListHouseholdInvitesResponseSchema,
  ListHouseholdMembersRequestParamsSchema,
  ListHouseholdMembersResponseSchema,
  ListHouseholdsResponseSchema,
  ListMyHouseholdInvitesResponseSchema,
  RemoveHouseholdMemberRequestParamsSchema,
  RevokeHouseholdInviteRequestParamsSchema,
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

export const acceptInvite = createAuthenticatedHandler({
  params: AcceptHouseholdInviteRequestParamsSchema,
  handle: ({ user, params }) => householdsService.acceptInvite(user.id, user.email, params.id),
  status: 'no-content',
});

export const revokeInvite = createHouseholdHandler({
  params: RevokeHouseholdInviteRequestParamsSchema,
  handle: ({ household, params }) =>
    householdsService.revokeInvite(household, params.id, params.inviteId),
  status: 'no-content',
});
