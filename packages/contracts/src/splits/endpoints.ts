import { z } from "zod";
import { defineEndpoint } from "../api.js";
import { listMetaSchema } from "../list.js";
import {
  addSplitInstallmentsBodySchema,
  createSplitBodySchema,
  linkSplitInstallmentBodySchema,
  listSplitsQuerySchema,
  splitIdParamsSchema,
  splitInstallmentParamsSchema,
  splitParticipantInputSchema,
  splitParticipantParamsSchema,
  updateSplitBodySchema,
  updateSplitInstallmentBodySchema,
  updateSplitParticipantBodySchema,
} from "./requests.js";
import { splitDetailSchema, splitInstallmentSchema, splitSchema } from "./resource.js";

const installmentAction = (action: string) =>
  defineEndpoint({
    method: "post",
    path: `/splits/:id/installments/:installmentId/${action}`,
    params: splitInstallmentParamsSchema,
    response: splitInstallmentSchema,
    status: 200,
  });

export const splitsEndpoints = {
  list: defineEndpoint({
    method: "get",
    path: "/splits",
    query: listSplitsQuerySchema,
    response: z.array(splitSchema),
    meta: listMetaSchema(),
    status: 200,
  }),
  get: defineEndpoint({
    method: "get",
    path: "/splits/:id",
    params: splitIdParamsSchema,
    response: splitDetailSchema,
    status: 200,
  }),
  create: defineEndpoint({
    method: "post",
    path: "/splits",
    body: createSplitBodySchema,
    response: splitDetailSchema,
    status: 201,
  }),
  update: defineEndpoint({
    method: "patch",
    path: "/splits/:id",
    params: splitIdParamsSchema,
    body: updateSplitBodySchema,
    response: splitDetailSchema,
    status: 200,
  }),
  delete: defineEndpoint({
    method: "delete",
    path: "/splits/:id",
    params: splitIdParamsSchema,
    status: 204,
  }),
  addParticipant: defineEndpoint({
    method: "post",
    path: "/splits/:id/participants",
    params: splitIdParamsSchema,
    body: splitParticipantInputSchema,
    response: splitDetailSchema,
    status: 201,
  }),
  updateParticipant: defineEndpoint({
    method: "patch",
    path: "/splits/:id/participants/:participantId",
    params: splitParticipantParamsSchema,
    body: updateSplitParticipantBodySchema,
    response: splitDetailSchema,
    status: 200,
  }),
  removeParticipant: defineEndpoint({
    method: "delete",
    path: "/splits/:id/participants/:participantId",
    params: splitParticipantParamsSchema,
    response: splitDetailSchema,
    status: 200,
  }),
  addInstallments: defineEndpoint({
    method: "post",
    path: "/splits/:id/participants/:participantId/installments",
    params: splitParticipantParamsSchema,
    body: addSplitInstallmentsBodySchema,
    response: splitDetailSchema,
    status: 201,
  }),
  updateInstallment: defineEndpoint({
    method: "patch",
    path: "/splits/:id/installments/:installmentId",
    params: splitInstallmentParamsSchema,
    body: updateSplitInstallmentBodySchema,
    response: splitInstallmentSchema,
    status: 200,
  }),
  removeInstallment: defineEndpoint({
    method: "delete",
    path: "/splits/:id/installments/:installmentId",
    params: splitInstallmentParamsSchema,
    status: 204,
  }),
  /** Links an incoming (income) transaction as the payment for this installment. */
  linkInstallment: defineEndpoint({
    method: "post",
    path: "/splits/:id/installments/:installmentId/link",
    params: splitInstallmentParamsSchema,
    body: linkSplitInstallmentBodySchema,
    response: splitInstallmentSchema,
    status: 200,
  }),
  receiveInstallment: installmentAction("received"),
  skipInstallment: installmentAction("skip"),
  /** "I'll take the loss": stops counting this installment as outstanding. */
  writeOffInstallment: installmentAction("write-off"),
  resetInstallment: installmentAction("reset"),
} as const;
