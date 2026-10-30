import type {
  CreateInvestmentAccountInput,
  InvestmentAccount,
  InvestmentSettings,
  Portfolio,
} from "@luraba/contracts/investments";
import { formatISODateTime } from "@luraba/domain";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";
import { createAccount as createBaseAccount } from "@/modules/accounts/accounts.service";
import { NotFoundError, ValidationError } from "@/shared/errors";
import { getCurrencyOrThrow } from "./investments.currency";
import * as repo from "./investments.repository";
import type { InvestmentAccountRecord, PortfolioRecord } from "./investments.types";
import { accountTotals, invalidateAccountTotals } from "./investments.valuation";

export const accountTotalsInvalidate = invalidateAccountTotals;

async function householdDefaultCurrency(context: HouseholdContext): Promise<string> {
  const { householdsTable } = await import("@luraba/db/schemas/households.schema");
  const { eq } = await import("drizzle-orm");
  const [row] = await db
    .select({ code: householdsTable.defaultCurrencyId })
    .from(householdsTable)
    .where(eq(householdsTable.id, context.householdId));
  return row?.code ?? "BRL";
}

export async function loadSettings(context: HouseholdContext) {
  return repo.getOrCreateSettings(context, await householdDefaultCurrency(context));
}

export async function getSettings(context: HouseholdContext): Promise<InvestmentSettings> {
  const s = await loadSettings(context);
  return {
    reportingCurrencyCode: s.reportingCurrencyId,
    defaultCostBasisMethod:
      s.defaultCostBasisMethod as InvestmentSettings["defaultCostBasisMethod"],
    defaultTaxProfile: s.defaultTaxProfile as InvestmentSettings["defaultTaxProfile"],
  };
}

export async function updateSettings(
  context: HouseholdContext,
  body: Partial<InvestmentSettings>,
): Promise<InvestmentSettings> {
  await loadSettings(context);
  if (body.reportingCurrencyCode) await getCurrencyOrThrow(body.reportingCurrencyCode);
  await repo.updateSettings(context, {
    ...(body.reportingCurrencyCode ? { reportingCurrencyId: body.reportingCurrencyCode } : {}),
    ...(body.defaultCostBasisMethod ? { defaultCostBasisMethod: body.defaultCostBasisMethod } : {}),
    ...(body.defaultTaxProfile ? { defaultTaxProfile: body.defaultTaxProfile } : {}),
  });
  return getSettings(context);
}

// ---------------------------------------------------------------- portfolios

async function toPortfolio(context: HouseholdContext, record: PortfolioRecord): Promise<Portfolio> {
  const accounts = (await repo.portfolioAccountIds(context, record.id)).get(record.id) ?? [];
  return {
    id: record.id,
    name: record.name,
    reportingCurrencyCode: record.reportingCurrencyId,
    accountIds: accounts,
    createdAt: formatISODateTime(record.createdAt),
    updatedAt: formatISODateTime(record.updatedAt),
  };
}

export async function listPortfolios(context: HouseholdContext): Promise<Portfolio[]> {
  const rows = await repo.portfoliosRepository.list(context);
  const accounts = await repo.portfolioAccountIds(context);
  return rows.map((record) => ({
    id: record.id,
    name: record.name,
    reportingCurrencyCode: record.reportingCurrencyId,
    accountIds: accounts.get(record.id) ?? [],
    createdAt: formatISODateTime(record.createdAt),
    updatedAt: formatISODateTime(record.updatedAt),
  }));
}

export async function createPortfolio(
  context: HouseholdContext,
  body: { name: string; reportingCurrencyCode: string },
): Promise<Portfolio> {
  await getCurrencyOrThrow(body.reportingCurrencyCode);
  const record = await repo.portfoliosRepository.create(context, {
    name: body.name,
    reportingCurrencyId: body.reportingCurrencyCode,
  });
  return toPortfolio(context, record);
}

export async function updatePortfolio(
  context: HouseholdContext,
  id: string,
  body: { name?: string; reportingCurrencyCode?: string },
): Promise<Portfolio> {
  if (body.reportingCurrencyCode) await getCurrencyOrThrow(body.reportingCurrencyCode);
  const record = await repo.portfoliosRepository.update(id, context, {
    ...(body.name ? { name: body.name } : {}),
    ...(body.reportingCurrencyCode ? { reportingCurrencyId: body.reportingCurrencyCode } : {}),
  });
  if (!record) throw new NotFoundError("Portfolio");
  return toPortfolio(context, record);
}

export async function deletePortfolio(context: HouseholdContext, id: string): Promise<void> {
  const deleted = await repo.portfoliosRepository.delete(id, context);
  if (!deleted) throw new NotFoundError("Portfolio");
}

// ---------------------------------------------------------------- accounts

export async function requireInvestmentAccount(
  context: HouseholdContext,
  id: string,
): Promise<InvestmentAccountRecord> {
  const settings = await loadSettings(context);
  const [account] = await repo.listInvestmentAccounts(
    context,
    { costBasisMethod: settings.defaultCostBasisMethod, taxProfile: settings.defaultTaxProfile },
    [id],
  );
  if (!account) throw new NotFoundError("Investment account");
  return account;
}

async function toAccount(account: InvestmentAccountRecord): Promise<InvestmentAccount> {
  const totals = await accountTotals(
    { householdId: account.householdId } as HouseholdContext,
    account.id,
  ).catch(() => null);
  return {
    id: account.id,
    name: account.name,
    imageUploadId: account.imageUploadId,
    institutionLogoUrl: account.institutionLogoUrl,
    broker: account.settings.broker,
    country: account.settings.country,
    currencyCode: account.currencyId,
    costBasisMethod: account.settings.costBasisMethod as InvestmentAccount["costBasisMethod"],
    taxProfile: account.settings.taxProfile as InvestmentAccount["taxProfile"],
    autoCreditIncome: account.settings.autoCreditIncome,
    portfolioId: account.settings.portfolioId,
    cash: totals?.cash ?? [],
    positionsValue: totals?.positionsValue ?? 0,
    totalValue: totals?.totalValue ?? 0,
    createdByUserId: account.createdByUserId,
  };
}

export async function listAccounts(context: HouseholdContext): Promise<InvestmentAccount[]> {
  const settings = await loadSettings(context);
  const accounts = await repo.listInvestmentAccounts(context, {
    costBasisMethod: settings.defaultCostBasisMethod,
    taxProfile: settings.defaultTaxProfile,
  });
  return Promise.all(accounts.map((account) => toAccountFor(context, account)));
}

async function toAccountFor(
  context: HouseholdContext,
  account: InvestmentAccountRecord,
): Promise<InvestmentAccount> {
  const totals = await accountTotals(context, account.id).catch(() => null);
  return {
    ...(await toAccount(account)),
    cash: totals?.cash ?? [],
    positionsValue: totals?.positionsValue ?? 0,
    totalValue: totals?.totalValue ?? 0,
  };
}

export async function getAccount(
  context: HouseholdContext,
  id: string,
): Promise<InvestmentAccount> {
  return toAccountFor(context, await requireInvestmentAccount(context, id));
}

export async function createAccount(
  context: HouseholdContext,
  body: CreateInvestmentAccountInput,
): Promise<InvestmentAccount> {
  const settings = await loadSettings(context);
  if (body.portfolioId && !(await repo.portfoliosRepository.get(body.portfolioId, context)))
    throw new NotFoundError("Portfolio");
  const base = await createBaseAccount(context, {
    name: body.name,
    type: "investment",
    currencyCode: body.currencyCode,
    institutionName: body.broker ?? undefined,
    details: { kind: "investment", subtype: "brokerage" },
  } as never);
  await repo.upsertAccountSettings(base.id, {
    broker: body.broker ?? null,
    country: body.country ?? "BR",
    costBasisMethod: body.costBasisMethod ?? settings.defaultCostBasisMethod,
    taxProfile: body.taxProfile ?? settings.defaultTaxProfile,
    autoCreditIncome: body.autoCreditIncome ?? true,
    portfolioId: body.portfolioId ?? null,
  });
  return getAccount(context, base.id);
}

export async function updateAccountSettings(
  context: HouseholdContext,
  id: string,
  body: {
    broker?: string | null;
    country?: string;
    costBasisMethod?: string;
    taxProfile?: string;
    autoCreditIncome?: boolean;
    portfolioId?: string | null;
  },
): Promise<InvestmentAccount> {
  const account = await requireInvestmentAccount(context, id);
  if (body.portfolioId && !(await repo.portfoliosRepository.get(body.portfolioId, context)))
    throw new NotFoundError("Portfolio");
  if (body.costBasisMethod && body.costBasisMethod !== account.settings.costBasisMethod) {
    const { eventsRepository } = repo;
    const events = await eventsRepository.listForEngine(context, [id]);
    const { runAccountLedger } = await import("./investments.valuation");
    const next = {
      ...account,
      settings: { ...account.settings, costBasisMethod: body.costBasisMethod },
    };
    const result = runAccountLedger(next, events);
    const oversell = result.issues.find((issue) => issue.code === "OVERSELL");
    if (oversell) throw new ValidationError(oversell.message);
  }
  await repo.upsertAccountSettings(id, body);
  invalidateAccountTotals(id);
  return getAccount(context, id);
}
