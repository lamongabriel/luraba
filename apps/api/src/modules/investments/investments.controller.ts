import { investmentsEndpoints as e } from "@luraba/contracts/investments";
import { createHouseholdHandler } from "@/shared/controllers/household.controller";
import { withApiMeta } from "@/shared/response";
import * as accounts from "./investments.accounts.service";
import * as assets from "./investments.assets.service";
import * as events from "./investments.events.service";
import * as importer from "./investments.import.service";
import * as reports from "./investments.reports.service";

export const getSettings = createHouseholdHandler({
  response: e.getSettings.response,
  handle: ({ household }) => accounts.getSettings(household),
});
export const updateSettings = createHouseholdHandler({
  body: e.updateSettings.body,
  response: e.updateSettings.response,
  handle: ({ household, body }) => accounts.updateSettings(household, body),
});

export const listPortfolios = createHouseholdHandler({
  response: e.listPortfolios.response,
  handle: ({ household }) => accounts.listPortfolios(household),
});
export const createPortfolio = createHouseholdHandler({
  body: e.createPortfolio.body,
  response: e.createPortfolio.response,
  status: "created",
  handle: ({ household, body }) => accounts.createPortfolio(household, body),
});
export const updatePortfolio = createHouseholdHandler({
  params: e.updatePortfolio.params,
  body: e.updatePortfolio.body,
  response: e.updatePortfolio.response,
  handle: ({ household, params, body }) => accounts.updatePortfolio(household, params.id, body),
});
export const deletePortfolio = createHouseholdHandler({
  params: e.deletePortfolio.params,
  status: "no-content",
  handle: ({ household, params }) => accounts.deletePortfolio(household, params.id),
});

export const listAccounts = createHouseholdHandler({
  response: e.listAccounts.response,
  handle: ({ household }) => accounts.listAccounts(household),
});
export const createAccount = createHouseholdHandler({
  body: e.createAccount.body,
  response: e.createAccount.response,
  status: "created",
  handle: ({ household, body }) => accounts.createAccount(household, body),
});
export const getAccount = createHouseholdHandler({
  params: e.getAccount.params,
  response: e.getAccount.response,
  handle: ({ household, params }) => accounts.getAccount(household, params.id),
});
export const updateAccountSettings = createHouseholdHandler({
  params: e.updateAccountSettings.params,
  body: e.updateAccountSettings.body,
  response: e.updateAccountSettings.response,
  handle: ({ household, params, body }) =>
    accounts.updateAccountSettings(household, params.id, body),
});
export const getAccountCash = createHouseholdHandler({
  params: e.getAccountCash.params,
  response: e.getAccountCash.response,
  handle: ({ household, params }) => events.getAccountCash(household, params.id),
});
export const addCashMovement = createHouseholdHandler({
  params: e.addCashMovement.params,
  body: e.addCashMovement.body,
  response: e.addCashMovement.response,
  status: "created",
  handle: ({ household, params, body }) => events.addCashMovement(household, params.id, body),
});

export const listAssets = createHouseholdHandler({
  query: e.listAssets.query,
  response: e.listAssets.response,
  handle: ({ household, query }) => assets.listAssets(household, query),
});
export const searchAssets = createHouseholdHandler({
  query: e.searchAssets.query,
  response: e.searchAssets.response,
  handle: ({ household, query }) => assets.searchAssets(household, query),
});
export const createAsset = createHouseholdHandler({
  body: e.createAsset.body,
  response: e.createAsset.response,
  status: "created",
  handle: ({ household, body }) => assets.createAsset(household, body),
});
export const importCandidate = createHouseholdHandler({
  body: e.importCandidate.body,
  response: e.importCandidate.response,
  status: "created",
  handle: ({ household, body }) => assets.importCandidate(household, body),
});
export const getAsset = createHouseholdHandler({
  params: e.getAsset.params,
  response: e.getAsset.response,
  handle: ({ household, params }) => assets.getAsset(household, params.id),
});
export const updateAsset = createHouseholdHandler({
  params: e.updateAsset.params,
  body: e.updateAsset.body,
  response: e.updateAsset.response,
  handle: ({ household, params, body }) => assets.updateAsset(household, params.id, body),
});
export const setFixedIncomeTerms = createHouseholdHandler({
  params: e.setFixedIncomeTerms.params,
  body: e.setFixedIncomeTerms.body,
  response: e.setFixedIncomeTerms.response,
  handle: ({ household, params, body }) => assets.setFixedIncomeTerms(household, params.id, body),
});
export const getAssetDetail = createHouseholdHandler({
  params: e.getAssetDetail.params,
  query: e.getAssetDetail.query,
  response: e.getAssetDetail.response,
  handle: ({ household, params, query }) => assets.assetDetail(household, params.id, query),
});
export const setManualPrice = createHouseholdHandler({
  params: e.setManualPrice.params,
  body: e.setManualPrice.body,
  response: e.setManualPrice.response,
  status: "created",
  handle: ({ household, params, body }) => assets.setManualPrice(household, params.id, body),
});
export const getPriceOn = createHouseholdHandler({
  params: e.getPriceOn.params,
  query: e.getPriceOn.query,
  response: e.getPriceOn.response,
  handle: ({ household, params, query }) => assets.priceOn(household, params.id, query.date),
});

export const listEvents = createHouseholdHandler({
  query: e.listEvents.query,
  response: e.listEvents.response,
  meta: e.listEvents.meta,
  handle: async ({ household, query }) => {
    const result = await events.listEvents(household, query);
    return withApiMeta(result.data, result.meta);
  },
});
export const createEvent = createHouseholdHandler({
  body: e.createEvent.body,
  response: e.createEvent.response,
  status: "created",
  handle: ({ household, body }) => events.createEvent(household, body),
});
export const updateEvent = createHouseholdHandler({
  params: e.updateEvent.params,
  body: e.updateEvent.body,
  response: e.updateEvent.response,
  handle: ({ household, params, body }) => events.updateEvent(household, params.id, body),
});
export const deleteEvent = createHouseholdHandler({
  params: e.deleteEvent.params,
  status: "no-content",
  handle: ({ household, params }) => events.deleteEvent(household, params.id),
});

export const listPositions = createHouseholdHandler({
  query: e.listPositions.query,
  response: e.listPositions.response,
  handle: ({ household, query }) => reports.listPositions(household, query),
});
export const getDashboard = createHouseholdHandler({
  query: e.getDashboard.query,
  response: e.getDashboard.response,
  handle: ({ household, query }) => reports.dashboard(household, query),
});
export const getIncome = createHouseholdHandler({
  query: e.getIncome.query,
  response: e.getIncome.response,
  handle: ({ household, query }) => reports.income(household, query),
});
export const getTaxes = createHouseholdHandler({
  query: e.getTaxes.query,
  response: e.getTaxes.response,
  handle: ({ household, query }) => reports.taxes(household, query),
});
export const markDarfPaid = createHouseholdHandler({
  body: e.markDarfPaid.body,
  response: e.markDarfPaid.response,
  status: "created",
  handle: ({ household, body }) => reports.markDarfPaid(household, body),
});
export const getHoldingsAt = createHouseholdHandler({
  query: e.getHoldingsAt.query,
  response: e.getHoldingsAt.response,
  handle: ({ household, query }) => reports.holdingsAt(household, query),
});

export const getAllocation = createHouseholdHandler({
  query: e.getAllocation.query,
  response: e.getAllocation.response,
  handle: ({ household, query }) => reports.allocation(household, query),
});
export const setAllocationTargets = createHouseholdHandler({
  params: e.setAllocationTargets.params,
  body: e.setAllocationTargets.body,
  response: e.setAllocationTargets.response,
  handle: ({ household, params, body }) => reports.setTargets(household, params.id, body),
});
export const getRebalance = createHouseholdHandler({
  query: e.getRebalance.query,
  response: e.getRebalance.response,
  handle: ({ household, query }) => reports.rebalance(household, query),
});

export const listProviders = createHouseholdHandler({
  response: e.listProviders.response,
  handle: ({ household }) => assets.listProviders(household),
});
export const updateProvider = createHouseholdHandler({
  params: e.updateProvider.params,
  body: e.updateProvider.body,
  response: e.updateProvider.response,
  handle: ({ household, params, body }) =>
    assets.updateProvider(household, params.providerId, body),
});
export const refreshPrices = createHouseholdHandler({
  body: e.refreshPrices.body,
  response: e.refreshPrices.response,
  handle: ({ household, body }) => assets.refreshPrices(household, body),
});

export const previewImport = createHouseholdHandler({
  body: e.previewImport.body,
  response: e.previewImport.response,
  status: "created",
  handle: ({ household, body }) => importer.previewImport(household, body),
});
export const commitImport = createHouseholdHandler({
  params: e.commitImport.params,
  body: e.commitImport.body,
  response: e.commitImport.response,
  handle: ({ household, params, body }) => importer.commitImport(household, params.batchId, body),
});
