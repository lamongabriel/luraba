import { createAuthenticatedHandler } from '@/shared/controllers/authenticated.controller';
import { createHouseholdHandler } from '@/shared/controllers/household.controller';
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
  response: ListHouseholdsResponseSchema,
  handle: ({ user }) => householdsService.listHouseholds(user.id),
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
  response: ListHouseholdMembersResponseSchema,
  handle: ({ household, params }) => householdsService.listMembers(household, params.id),
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
  response: ListHouseholdInvitesResponseSchema,
  handle: ({ household, params }) => householdsService.listHouseholdInvites(household, params.id),
});

export const listMyInvites = createAuthenticatedHandler({
  response: ListMyHouseholdInvitesResponseSchema,
  handle: ({ user }) => householdsService.listMyPendingInvites(user.email),
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
