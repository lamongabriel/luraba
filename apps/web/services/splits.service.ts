"use client";

import {
  type AddSplitInstallmentsInput,
  type CreateSplitInput,
  type GetSplitResult,
  type ListSplitsQuery,
  type ListSplitsResult,
  type SplitInstallmentResult,
  type SplitParticipantInput,
  splitsEndpoints,
  type UpdateSplitInput,
  type UpdateSplitInstallmentInput,
  type UpdateSplitParticipantInput,
} from "@luraba/contracts";
import { requestContract } from "@/services/contract-client.service";

export type InstallmentTarget = { id: string; installmentId: string };
export type ParticipantTarget = { id: string; participantId: string };

export const listSplits = (query: ListSplitsQuery = {}): Promise<ListSplitsResult> =>
  requestContract(splitsEndpoints.list, { query });

export const getSplit = (id: string): Promise<GetSplitResult> =>
  requestContract(splitsEndpoints.get, { params: { id } });

export const createSplit = (input: CreateSplitInput): Promise<GetSplitResult> =>
  requestContract(splitsEndpoints.create, { body: input });

export const updateSplit = (id: string, input: UpdateSplitInput): Promise<GetSplitResult> =>
  requestContract(splitsEndpoints.update, { params: { id }, body: input });

export const deleteSplit = (id: string): Promise<void> =>
  requestContract(splitsEndpoints.delete, { params: { id } });

export const addParticipant = (id: string, input: SplitParticipantInput): Promise<GetSplitResult> =>
  requestContract(splitsEndpoints.addParticipant, { params: { id }, body: input });

export const updateParticipant = (
  target: ParticipantTarget,
  input: UpdateSplitParticipantInput,
): Promise<GetSplitResult> =>
  requestContract(splitsEndpoints.updateParticipant, { params: target, body: input });

export const removeParticipant = (target: ParticipantTarget): Promise<GetSplitResult> =>
  requestContract(splitsEndpoints.removeParticipant, { params: target });

export const addInstallments = (
  target: ParticipantTarget,
  input: AddSplitInstallmentsInput,
): Promise<GetSplitResult> =>
  requestContract(splitsEndpoints.addInstallments, { params: target, body: input });

export const updateInstallment = (
  target: InstallmentTarget,
  input: UpdateSplitInstallmentInput,
): Promise<SplitInstallmentResult> =>
  requestContract(splitsEndpoints.updateInstallment, { params: target, body: input });

export const removeInstallment = (target: InstallmentTarget): Promise<void> =>
  requestContract(splitsEndpoints.removeInstallment, { params: target });

export const linkInstallment = (
  target: InstallmentTarget,
  transactionId: string,
): Promise<SplitInstallmentResult> =>
  requestContract(splitsEndpoints.linkInstallment, { params: target, body: { transactionId } });

export const receiveInstallment = (target: InstallmentTarget): Promise<SplitInstallmentResult> =>
  requestContract(splitsEndpoints.receiveInstallment, { params: target });

export const skipInstallment = (target: InstallmentTarget): Promise<SplitInstallmentResult> =>
  requestContract(splitsEndpoints.skipInstallment, { params: target });

export const writeOffInstallment = (target: InstallmentTarget): Promise<SplitInstallmentResult> =>
  requestContract(splitsEndpoints.writeOffInstallment, { params: target });

export const resetInstallment = (target: InstallmentTarget): Promise<SplitInstallmentResult> =>
  requestContract(splitsEndpoints.resetInstallment, { params: target });
