"use client";

import {
  type EndpointBody,
  type EndpointQuery,
  investmentsEndpoints as ep,
  type InvestmentExportKind,
} from "@luraba/contracts";
import { lurabaApiClient } from "@/api/luraba-api";
import { requestContract } from "@/services/contract-client.service";

type Body<K extends keyof typeof ep> = EndpointBody<(typeof ep)[K]>;
type Query<K extends keyof typeof ep> = EndpointQuery<(typeof ep)[K]>;

export const getInvestmentSettings = () => requestContract(ep.getSettings);
export const updateInvestmentSettings = (body: Body<"updateSettings">) =>
  requestContract(ep.updateSettings, { body });

export const listPortfolios = () => requestContract(ep.listPortfolios);
export const createPortfolio = (body: Body<"createPortfolio">) =>
  requestContract(ep.createPortfolio, { body });
export const updatePortfolio = (id: string, body: Body<"updatePortfolio">) =>
  requestContract(ep.updatePortfolio, { params: { id }, body });
export const deletePortfolio = (id: string) =>
  requestContract(ep.deletePortfolio, { params: { id } });

export const listInvestmentAccounts = () => requestContract(ep.listAccounts);
export const createInvestmentAccount = (body: Body<"createAccount">) =>
  requestContract(ep.createAccount, { body });
export const getInvestmentAccount = (id: string) =>
  requestContract(ep.getAccount, { params: { id } });
export const updateInvestmentAccountSettings = (id: string, body: Body<"updateAccountSettings">) =>
  requestContract(ep.updateAccountSettings, { params: { id }, body });
export const getInvestmentAccountCash = (id: string) =>
  requestContract(ep.getAccountCash, { params: { id } });
export const addInvestmentCashMovement = (id: string, body: Body<"addCashMovement">) =>
  requestContract(ep.addCashMovement, { params: { id }, body });

export const listAssets = (query: Query<"listAssets"> = {}) =>
  requestContract(ep.listAssets, { query });
export const searchAssets = (query: Query<"searchAssets">) =>
  requestContract(ep.searchAssets, { query });
export const createAsset = (body: Body<"createAsset">) => requestContract(ep.createAsset, { body });
export const importAssetCandidate = (body: Body<"importCandidate">) =>
  requestContract(ep.importCandidate, { body });
export const getAsset = (id: string) => requestContract(ep.getAsset, { params: { id } });
export const updateAsset = (id: string, body: Body<"updateAsset">) =>
  requestContract(ep.updateAsset, { params: { id }, body });
export const setFixedIncomeTerms = (id: string, body: Body<"setFixedIncomeTerms">) =>
  requestContract(ep.setFixedIncomeTerms, { params: { id }, body });
export const getAssetDetail = (id: string, query: Query<"getAssetDetail"> = {}) =>
  requestContract(ep.getAssetDetail, { params: { id }, query });
export const setManualPrice = (id: string, body: Body<"setManualPrice">) =>
  requestContract(ep.setManualPrice, { params: { id }, body });

export const listInvestmentEvents = (query: Query<"listEvents"> = {}) =>
  requestContract(ep.listEvents, { query });
export const createInvestmentEvent = (body: Body<"createEvent">) =>
  requestContract(ep.createEvent, { body });
export const updateInvestmentEvent = (id: string, body: Body<"updateEvent">) =>
  requestContract(ep.updateEvent, { params: { id }, body });
export const deleteInvestmentEvent = (id: string) =>
  requestContract(ep.deleteEvent, { params: { id } });

export const listPositions = (query: Query<"listPositions"> = {}) =>
  requestContract(ep.listPositions, { query });
export const getInvestmentDashboard = (query: Query<"getDashboard"> = {}) =>
  requestContract(ep.getDashboard, { query });
export const getInvestmentIncome = (query: Query<"getIncome"> = {}) =>
  requestContract(ep.getIncome, { query });
export const getInvestmentTaxes = (query: Query<"getTaxes">) =>
  requestContract(ep.getTaxes, { query });
export const markDarfPaid = (body: Body<"markDarfPaid">) =>
  requestContract(ep.markDarfPaid, { body });
export const listCorporateActions = (query: Query<"listCorporateActions"> = {}) =>
  requestContract(ep.listCorporateActions, { query });
export const getHoldingsAt = (query: Query<"getHoldingsAt">) =>
  requestContract(ep.getHoldingsAt, { query });

export const getAllocation = (query: Query<"getAllocation"> = {}) =>
  requestContract(ep.getAllocation, { query });
export const setAllocationTargets = (portfolioId: string, body: Body<"setAllocationTargets">) =>
  requestContract(ep.setAllocationTargets, { params: { id: portfolioId }, body });
export const getRebalance = (query: Query<"getRebalance">) =>
  requestContract(ep.getRebalance, { query });

export const listMarketDataProviders = () => requestContract(ep.listProviders);
export const updateMarketDataProvider = (providerId: string, body: Body<"updateProvider">) =>
  requestContract(ep.updateProvider, { params: { providerId }, body });
export const refreshInvestmentPrices = (body: Body<"refreshPrices"> = {}) =>
  requestContract(ep.refreshPrices, { body });

export const previewInvestmentImport = (body: Body<"previewImport">) =>
  requestContract(ep.previewImport, { body });
export const commitInvestmentImport = (batchId: string, body: Body<"commitImport"> = {}) =>
  requestContract(ep.commitImport, { params: { batchId }, body });

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function fileNameOf(disposition: unknown, fallback: string) {
  return /filename="([^"]+)"/u.exec(String(disposition ?? ""))?.[1] ?? fallback;
}

/** Downloads an investments export through the authenticated client. */
export async function downloadInvestmentExport(
  kind: InvestmentExportKind,
  params: { format: "csv" | "json"; accountId?: string; year?: number },
): Promise<string> {
  const response = await lurabaApiClient.get<Blob>(`/investments/export/${kind}`, {
    params,
    responseType: "blob",
  });
  const fileName = fileNameOf(
    response.headers["content-disposition"],
    `luraba-investments-${kind}.${params.format}`,
  );
  saveBlob(response.data, fileName);
  return fileName;
}

export async function downloadInvestmentImportTemplate(): Promise<string> {
  const response = await lurabaApiClient.get<Blob>("/investments/imports/template", {
    responseType: "blob",
  });
  const fileName = fileNameOf(
    response.headers["content-disposition"],
    "luraba-investments-template.csv",
  );
  saveBlob(response.data, fileName);
  return fileName;
}
