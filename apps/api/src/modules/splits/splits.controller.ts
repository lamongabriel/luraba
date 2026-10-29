import { splitsEndpoints } from "@luraba/contracts/splits";
import { createHouseholdHandler } from "@/shared/controllers/household.controller";
import { withApiMeta } from "@/shared/response";
import * as service from "./splits.service";

const e = splitsEndpoints;

export const list = createHouseholdHandler({
  query: e.list.query,
  response: e.list.response,
  meta: e.list.meta,
  handle: async ({ household, query }) => {
    const result = await service.listSplits(household, query);
    return withApiMeta(result.data, result.meta);
  },
});

export const get = createHouseholdHandler({
  params: e.get.params,
  response: e.get.response,
  handle: ({ household, params }) => service.getSplit(household, params.id),
});

export const create = createHouseholdHandler({
  body: e.create.body,
  response: e.create.response,
  status: "created",
  handle: ({ household, body }) => service.createSplit(household, body),
});

export const update = createHouseholdHandler({
  params: e.update.params,
  body: e.update.body,
  response: e.update.response,
  handle: ({ household, params, body }) => service.updateSplit(household, params.id, body),
});

export const deleteSplit = createHouseholdHandler({
  params: e.delete.params,
  status: "no-content",
  handle: ({ household, params }) => service.deleteSplit(household, params.id),
});

export const addParticipant = createHouseholdHandler({
  params: e.addParticipant.params,
  body: e.addParticipant.body,
  response: e.addParticipant.response,
  status: "created",
  handle: ({ household, params, body }) => service.addParticipant(household, params.id, body),
});

export const updateParticipant = createHouseholdHandler({
  params: e.updateParticipant.params,
  body: e.updateParticipant.body,
  response: e.updateParticipant.response,
  handle: ({ household, params, body }) =>
    service.updateParticipant(household, params.id, params.participantId, body),
});

export const removeParticipant = createHouseholdHandler({
  params: e.removeParticipant.params,
  response: e.removeParticipant.response,
  handle: ({ household, params }) =>
    service.removeParticipant(household, params.id, params.participantId),
});

export const addInstallments = createHouseholdHandler({
  params: e.addInstallments.params,
  body: e.addInstallments.body,
  response: e.addInstallments.response,
  status: "created",
  handle: ({ household, params, body }) =>
    service.addInstallments(household, params.id, params.participantId, body),
});

export const updateInstallment = createHouseholdHandler({
  params: e.updateInstallment.params,
  body: e.updateInstallment.body,
  response: e.updateInstallment.response,
  handle: ({ household, params, body }) =>
    service.updateInstallment(household, params.id, params.installmentId, body),
});

export const removeInstallment = createHouseholdHandler({
  params: e.removeInstallment.params,
  status: "no-content",
  handle: ({ household, params }) =>
    service.removeInstallment(household, params.id, params.installmentId),
});

export const linkInstallment = createHouseholdHandler({
  params: e.linkInstallment.params,
  body: e.linkInstallment.body,
  response: e.linkInstallment.response,
  handle: ({ household, params, body }) =>
    service.linkInstallment(household, params.id, params.installmentId, body.transactionId),
});

export const receiveInstallment = createHouseholdHandler({
  params: e.receiveInstallment.params,
  response: e.receiveInstallment.response,
  handle: ({ household, params }) =>
    service.receiveInstallment(household, params.id, params.installmentId),
});

export const skipInstallment = createHouseholdHandler({
  params: e.skipInstallment.params,
  response: e.skipInstallment.response,
  handle: ({ household, params }) =>
    service.skipInstallment(household, params.id, params.installmentId),
});

export const writeOffInstallment = createHouseholdHandler({
  params: e.writeOffInstallment.params,
  response: e.writeOffInstallment.response,
  handle: ({ household, params }) =>
    service.writeOffInstallment(household, params.id, params.installmentId),
});

export const resetInstallment = createHouseholdHandler({
  params: e.resetInstallment.params,
  response: e.resetInstallment.response,
  handle: ({ household, params }) =>
    service.resetInstallment(household, params.id, params.installmentId),
});
