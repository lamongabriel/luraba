"use client";

import {
  type bulkDepositBodySchema,
  type createPiggyBankBodySchema,
  type depositToPiggyBankBodySchema,
  type movePiggyBankFundsBodySchema,
  type PiggyBankMovementKind,
  piggyBanksEndpoints,
  type setPiggyBankBalanceBodySchema,
  type updatePiggyBankBodySchema,
  type withdrawFromPiggyBankBodySchema,
} from "@luraba/contracts";
import type { z } from "zod";

// Request bodies are typed by what the form sends (dates as ISO strings), not by the parsed output.
type BulkDepositInput = z.input<typeof bulkDepositBodySchema>;
type CreatePiggyBankInput = z.input<typeof createPiggyBankBodySchema>;
type DepositToPiggyBankInput = z.input<typeof depositToPiggyBankBodySchema>;
type MovePiggyBankFundsInput = z.input<typeof movePiggyBankFundsBodySchema>;
type SetPiggyBankBalanceInput = z.input<typeof setPiggyBankBalanceBodySchema>;
type UpdatePiggyBankInput = z.input<typeof updatePiggyBankBodySchema>;
type WithdrawFromPiggyBankInput = z.input<typeof withdrawFromPiggyBankBodySchema>;

import { requestContract } from "@/services/contract-client.service";

export type ListPiggyBanksQuery = {
  parentAccountId?: string;
  goalId?: string;
  includeArchived?: boolean;
};
export type PiggyBankMovementsQuery = {
  page?: number;
  perPage?: number;
  kind?: PiggyBankMovementKind;
};

export const listPiggyBanks = (query: ListPiggyBanksQuery = {}) =>
  requestContract(piggyBanksEndpoints.list, { query });

export const getPiggyBank = (id: string) =>
  requestContract(piggyBanksEndpoints.get, { params: { id } });

export const getPiggyBanksReport = (month?: string) =>
  requestContract(piggyBanksEndpoints.report, { query: month ? { month } : {} });

export const listPiggyBankMovements = (id: string, query: PiggyBankMovementsQuery = {}) =>
  requestContract(piggyBanksEndpoints.movements, {
    params: { id },
    query,
  });

export const createPiggyBank = (body: CreatePiggyBankInput) =>
  requestContract(piggyBanksEndpoints.create, { body });

export const updatePiggyBank = (id: string, body: UpdatePiggyBankInput) =>
  requestContract(piggyBanksEndpoints.update, { params: { id }, body });

export const archivePiggyBank = (id: string) =>
  requestContract(piggyBanksEndpoints.archive, { params: { id } });

export const unarchivePiggyBank = (id: string) =>
  requestContract(piggyBanksEndpoints.unarchive, { params: { id } });

export const depositToPiggyBank = (id: string, body: DepositToPiggyBankInput) =>
  requestContract(piggyBanksEndpoints.deposit, { params: { id }, body });

export const withdrawFromPiggyBank = (id: string, body: WithdrawFromPiggyBankInput) =>
  requestContract(piggyBanksEndpoints.withdraw, { params: { id }, body });

export const bulkDeposit = (body: BulkDepositInput) =>
  requestContract(piggyBanksEndpoints.bulkDeposit, { body });

export const movePiggyBankFunds = (body: MovePiggyBankFundsInput) =>
  requestContract(piggyBanksEndpoints.move, { body });

export const setPiggyBankBalance = (id: string, body: SetPiggyBankBalanceInput) =>
  requestContract(piggyBanksEndpoints.setBalance, { params: { id }, body });

export const getGoalPiggyBanks = (goalId: string) =>
  requestContract(piggyBanksEndpoints.goalLinks, { params: { id: goalId } });

export const setGoalPiggyBanks = (goalId: string, piggyBankIds: string[]) =>
  requestContract(piggyBanksEndpoints.setGoalLinks, {
    params: { id: goalId },
    body: { piggyBankIds },
  });

export const getGoalPiggyPlan = (goalId: string) =>
  requestContract(piggyBanksEndpoints.goalPlan, { params: { id: goalId } });
