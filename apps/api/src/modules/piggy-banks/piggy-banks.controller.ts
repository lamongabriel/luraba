import { piggyBanksEndpoints } from "@luraba/contracts/piggy-banks";
import { createHouseholdHandler } from "@/shared/controllers/household.controller";
import { withApiMeta } from "@/shared/response";
import { accruePiggyBanks } from "./piggy-banks.accrual.service";
import * as funds from "./piggy-banks.funds.service";
import * as goals from "./piggy-banks.goals.service";
import * as service from "./piggy-banks.service";

const e = piggyBanksEndpoints;

export const list = createHouseholdHandler({
  query: e.list.query,
  response: e.list.response,
  handle: ({ household, query }) => service.listPiggyBanks(household, query),
});

export const report = createHouseholdHandler({
  query: e.report.query,
  response: e.report.response,
  handle: ({ household, query }) => service.reportPiggyBanks(household, query.month),
});

export const get = createHouseholdHandler({
  params: e.get.params,
  response: e.get.response,
  handle: ({ household, params }) => service.getPiggyBank(household, params.id),
});

export const create = createHouseholdHandler({
  body: e.create.body,
  response: e.create.response,
  status: "created",
  handle: ({ household, body }) => service.createPiggyBank(household, body),
});

export const update = createHouseholdHandler({
  params: e.update.params,
  body: e.update.body,
  response: e.update.response,
  handle: ({ household, params, body }) => service.updatePiggyBank(household, params.id, body),
});

export const archive = createHouseholdHandler({
  params: e.archive.params,
  response: e.archive.response,
  handle: ({ household, params }) => service.archivePiggyBank(household, params.id),
});

export const unarchive = createHouseholdHandler({
  params: e.unarchive.params,
  response: e.unarchive.response,
  handle: ({ household, params }) => service.unarchivePiggyBank(household, params.id),
});

export const movements = createHouseholdHandler({
  params: e.movements.params,
  query: e.movements.query,
  response: e.movements.response,
  meta: e.movements.meta,
  handle: async ({ household, params, query }) => {
    const result = await service.listMovements(household, params.id, query);
    return withApiMeta(result.data, result.meta);
  },
});

export const deposit = createHouseholdHandler({
  params: e.deposit.params,
  body: e.deposit.body,
  response: e.deposit.response,
  status: "created",
  handle: ({ household, params, body }) => funds.depositToPiggyBank(household, params.id, body),
});

export const withdraw = createHouseholdHandler({
  params: e.withdraw.params,
  body: e.withdraw.body,
  response: e.withdraw.response,
  status: "created",
  handle: ({ household, params, body }) => funds.withdrawFromPiggyBank(household, params.id, body),
});

export const bulkDeposit = createHouseholdHandler({
  body: e.bulkDeposit.body,
  response: e.bulkDeposit.response,
  status: "created",
  handle: ({ household, body }) => funds.bulkDeposit(household, body),
});

export const move = createHouseholdHandler({
  body: e.move.body,
  response: e.move.response,
  status: "created",
  handle: ({ household, body }) => funds.movePiggyBankFunds(household, body),
});

export const setBalance = createHouseholdHandler({
  params: e.setBalance.params,
  body: e.setBalance.body,
  response: e.setBalance.response,
  status: "created",
  handle: ({ household, params, body }) => funds.setPiggyBankBalance(household, params.id, body),
});

/** Runs the accrual now; it covers every household, so it is limited to owners and admins by route. */
export const accrue = createHouseholdHandler({
  body: e.accrue.body,
  response: e.accrue.response,
  handle: ({ body }) => accruePiggyBanks({ through: body.through }),
});

export const goalLinks = createHouseholdHandler({
  params: e.goalLinks.params,
  response: e.goalLinks.response,
  handle: ({ household, params }) => goals.getGoalPiggyBanks(household, params.id),
});

export const setGoalLinks = createHouseholdHandler({
  params: e.setGoalLinks.params,
  body: e.setGoalLinks.body,
  response: e.setGoalLinks.response,
  handle: ({ household, params, body }) =>
    goals.setGoalPiggyBanks(household, params.id, body.piggyBankIds),
});

export const goalPlan = createHouseholdHandler({
  params: e.goalPlan.params,
  response: e.goalPlan.response,
  handle: ({ household, params }) => goals.getGoalPiggyPlan(household, params.id),
});
