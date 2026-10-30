import type {
  AssetCandidate,
  AssetDetail,
  FixedIncomeTermsInput,
  InvestmentAsset,
} from "@luraba/contracts/investments";
import {
  addIsoDays,
  curveSeries,
  d,
  diffIsoDays,
  type FixedIncomeTerms,
  irBracketTimeline,
  isFixedIncomeClass,
  ZERO,
} from "@luraba/domain";
import type { HouseholdContext } from "@/config/permissions";
import { marketDataRepository } from "@/modules/market-data/market-data.repository";
import { marketDataService } from "@/modules/market-data/market-data.service";
import { ConflictError, NotFoundError, ValidationError } from "@/shared/errors";
import { getCurrencyOrThrow } from "./investments.currency";
import { toEventResource } from "./investments.mappers";
import { toPosition } from "./investments.reports.service";
import * as repo from "./investments.repository";
import type { AssetRecord, FixedIncomeTermsRecord } from "./investments.types";
import { computeHoldings, resolveScope } from "./investments.valuation";

function termsResource(t: FixedIncomeTermsRecord | undefined): InvestmentAsset["fixedIncome"] {
  if (!t) return null;
  return {
    issuer: t.issuer,
    issueDate: t.issueDate,
    maturityDate: t.maturityDate,
    principal: t.principal ? d(t.principal).toFixed() : null,
    indexer: t.indexer as never,
    rateForm: t.rateForm as never,
    rate: d(t.rate).toFixed(),
    couponSchedule: t.couponSchedule ?? null,
    liquidity: t.liquidity,
    fgcCovered: t.fgcCovered,
    dayCount: t.dayCount as never,
    tesouroTitle: t.tesouroTitle,
  };
}

export async function toAssets(
  context: HouseholdContext,
  assets: AssetRecord[],
): Promise<InvestmentAsset[]> {
  const ids = assets.map((a) => a.id);
  const [symbols, terms, settings] = await Promise.all([
    marketDataRepository.providerSymbols(ids),
    repo.getFixedIncomeTerms(ids),
    repo.getHouseholdAssetSettings(context, ids),
  ]);
  return assets.map((asset) => ({
    id: asset.id,
    symbol: asset.symbol,
    name: asset.name,
    assetClass: asset.assetClass as never,
    exchange: asset.exchange,
    country: asset.country,
    currencyCode: asset.currencyId,
    isin: asset.isin,
    sector: settings.get(asset.id)?.sector ?? asset.sector,
    industry: settings.get(asset.id)?.industry ?? asset.industry,
    logoUrl: asset.logoUrl,
    isCustom: asset.isCustom,
    providerSymbols: symbols.get(asset.id) ?? {},
    tags: settings.get(asset.id)?.tags ?? [],
    fixedIncome: termsResource(terms.get(asset.id)),
  }));
}

async function requireAsset(context: HouseholdContext, id: string): Promise<AssetRecord> {
  const asset = await repo.findAsset(context, id);
  if (!asset) throw new NotFoundError("Asset");
  return asset;
}

export async function getAsset(context: HouseholdContext, id: string): Promise<InvestmentAsset> {
  const [asset] = await toAssets(context, [await requireAsset(context, id)]);
  return asset as InvestmentAsset;
}

export async function listAssets(
  context: HouseholdContext,
  query: { search?: string; assetClass?: string; held?: boolean; limit: number },
) {
  let ids: string[] | undefined;
  if (query.held) {
    const scope = await resolveScope(context);
    ids = await repo.eventsRepository.assetIdsHeld(
      context,
      scope.accounts.map((a) => a.id),
    );
    if (ids.length === 0) return [];
  }
  return toAssets(context, await repo.searchAssets(context, { ...query, ids }));
}

export async function searchAssets(
  context: HouseholdContext,
  query: { q: string; remote: boolean },
): Promise<AssetCandidate[]> {
  const local = await repo.searchAssets(context, { search: query.q, limit: 15 });
  const candidates: AssetCandidate[] = local.map((a) => ({
    symbol: a.symbol,
    name: a.name,
    assetClass: a.assetClass as never,
    exchange: a.exchange,
    country: a.country,
    currencyCode: a.currencyId,
    provider: "catalog",
    providerSymbol: a.symbol,
    assetId: a.id,
  }));
  if (query.remote) {
    const remote = await marketDataService.search(context.householdId, query.q).catch(() => []);
    for (const r of remote) {
      if (
        candidates.some((c) => c.symbol === r.symbol && (c.exchange ?? "") === (r.exchange ?? ""))
      )
        continue;
      candidates.push({
        symbol: r.symbol,
        name: r.name,
        assetClass: (r.assetClass as never) ?? null,
        exchange: r.exchange,
        country: r.country,
        currencyCode: r.currency,
        provider: r.provider,
        providerSymbol: r.providerSymbol,
        assetId: null,
      });
    }
  }
  return candidates;
}

function termValues(input: FixedIncomeTermsInput) {
  return {
    issuer: input.issuer ?? null,
    issueDate: input.issueDate ?? null,
    maturityDate: input.maturityDate ?? null,
    principal:
      input.principal === null || input.principal === undefined ? null : String(input.principal),
    indexer: input.indexer,
    rateForm: input.rateForm,
    rate: String(input.rate),
    couponSchedule:
      input.couponSchedule?.map((c) => ({
        date: c.date,
        ...(c.rate !== undefined ? { rate: String(c.rate) } : {}),
      })) ?? null,
    liquidity: input.liquidity ?? null,
    fgcCovered: input.fgcCovered ?? false,
    dayCount: input.dayCount ?? "BUS_252",
    tesouroTitle: input.tesouroTitle ?? null,
  };
}

type CreateAssetBody = {
  symbol: string;
  name: string;
  assetClass: string;
  exchange?: string | null;
  country?: string | null;
  currencyCode: string;
  isin?: string | null;
  sector?: string | null;
  industry?: string | null;
  providerSymbols?: Record<string, string>;
  fixedIncome?: FixedIncomeTermsInput;
};

export async function createAsset(
  context: HouseholdContext,
  body: CreateAssetBody,
): Promise<InvestmentAsset> {
  await getCurrencyOrThrow(body.currencyCode);
  if (isFixedIncomeClass(body.assetClass as never) && !body.fixedIncome) {
    throw new ValidationError("Fixed income assets need their terms (indexer, rate, maturity)");
  }
  const existing = await repo.findAssetBySymbol(context, body.symbol, body.exchange ?? null);
  if (existing) throw new ConflictError("An asset with this symbol already exists");
  const asset = await repo.insertAsset({
    householdId: context.householdId,
    symbol: body.symbol,
    name: body.name,
    assetClass: body.assetClass,
    exchange: body.exchange ?? null,
    country: body.country ?? null,
    currencyId: body.currencyCode,
    isin: body.isin ?? null,
    sector: body.sector ?? null,
    industry: body.industry ?? null,
    isCustom: true,
    createdByUserId: context.userId,
  } as never);
  if (body.providerSymbols) await repo.replaceProviderSymbols(asset.id, body.providerSymbols);
  if (body.fixedIncome) await repo.upsertFixedIncomeTerms(asset.id, termValues(body.fixedIncome));
  return getAsset(context, asset.id);
}

export async function importCandidate(
  context: HouseholdContext,
  body: {
    symbol: string;
    name: string;
    assetClass?: string | null;
    exchange?: string | null;
    country?: string | null;
    currencyCode?: string | null;
    provider: string;
    providerSymbol: string;
  },
): Promise<InvestmentAsset> {
  const symbol = body.symbol.toUpperCase().replace(/\.SA$/u, "");
  const existing = await repo.findAssetBySymbol(context, symbol, body.exchange ?? null);
  if (existing) {
    const current = (await marketDataRepository.providerSymbols([existing.id])).get(existing.id);
    await repo.replaceProviderSymbols(existing.id, {
      ...(current ?? {}),
      [body.provider]: body.providerSymbol,
    });
    return getAsset(context, existing.id);
  }
  const brazilian = body.country === "BR" || /\.SA$/u.test(body.providerSymbol);
  return createAsset(context, {
    symbol,
    name: body.name,
    assetClass: body.assetClass ?? "STOCK",
    exchange: body.exchange ?? null,
    country: body.country ?? (brazilian ? "BR" : "US"),
    currencyCode: body.currencyCode ?? (brazilian ? "BRL" : "USD"),
    providerSymbols: { [body.provider]: body.providerSymbol },
  });
}

export async function updateAsset(
  context: HouseholdContext,
  id: string,
  body: Partial<CreateAssetBody> & { tags?: string[] },
): Promise<InvestmentAsset> {
  const asset = await requireAsset(context, id);
  const { tags, sector, industry, providerSymbols, fixedIncome, currencyCode, ...core } = body;
  if (asset.householdId === context.householdId) {
    if (currencyCode) await getCurrencyOrThrow(currencyCode);
    await repo.updateAssetRow(id, {
      ...(core.name ? { name: core.name } : {}),
      ...(core.assetClass ? { assetClass: core.assetClass } : {}),
      ...(core.symbol ? { symbol: core.symbol } : {}),
      ...(core.exchange !== undefined ? { exchange: core.exchange } : {}),
      ...(core.country !== undefined ? { country: core.country } : {}),
      ...(core.isin !== undefined ? { isin: core.isin } : {}),
      ...(currencyCode ? { currencyId: currencyCode } : {}),
    });
    if (providerSymbols) await repo.replaceProviderSymbols(id, providerSymbols);
    if (fixedIncome) await repo.upsertFixedIncomeTerms(id, termValues(fixedIncome));
  }
  // Sector, industry and tags on a catalog asset are the household's own override.
  if (sector !== undefined || industry !== undefined || tags !== undefined) {
    await repo.upsertHouseholdAssetSettings(context, id, {
      ...(sector !== undefined ? { sector } : {}),
      ...(industry !== undefined ? { industry } : {}),
      ...(tags !== undefined ? { tags } : {}),
    });
  }
  return getAsset(context, id);
}

export async function setFixedIncomeTerms(
  context: HouseholdContext,
  id: string,
  body: FixedIncomeTermsInput,
): Promise<InvestmentAsset> {
  const asset = await requireAsset(context, id);
  if (!isFixedIncomeClass(asset.assetClass as never)) {
    throw new ValidationError("Only fixed income assets have terms");
  }
  if (asset.householdId !== context.householdId) {
    throw new ValidationError("Terms of catalog assets cannot be changed");
  }
  await repo.upsertFixedIncomeTerms(id, termValues(body));
  return getAsset(context, id);
}

export async function setManualPrice(
  context: HouseholdContext,
  id: string,
  body: { date: string; price: string },
): Promise<InvestmentAsset> {
  const asset = await requireAsset(context, id);
  await marketDataService.setManualPrice(asset, body.date, body.price);
  return getAsset(context, id);
}

export async function priceOn(context: HouseholdContext, id: string, date: string) {
  await requireAsset(context, id);
  const row = await marketDataRepository.getLatestPrice(id, date);
  return {
    price: row ? d(row.close).toFixed() : null,
    date: row?.date ?? null,
    source: row?.source ?? null,
  };
}

const RANGE_DAYS: Record<string, number | null> = {
  "5D": 5,
  "1M": 31,
  "6M": 183,
  "1Y": 365,
  "5Y": 1826,
  MAX: null,
};

export async function assetDetail(
  context: HouseholdContext,
  id: string,
  query: { range: string; accountId?: string },
): Promise<AssetDetail> {
  const asset = await requireAsset(context, id);
  const [resource] = await toAssets(context, [asset]);
  const scope = await resolveScope(context, { accountId: query.accountId });
  const holdings = await computeHoldings(scope);
  const row = holdings.rows.find((r) => r.asset.id === id);
  const position = row ? await toPosition(scope, row, holdings.totalMarketValue, false) : null;

  const events = holdings.ledgers
    .flatMap((l) => l.events)
    .filter((e) => e.assetId === id)
    .sort((a, b) => b.tradeDate.localeCompare(a.tradeDate));
  const today = scope.today;
  const days =
    query.range === "YTD"
      ? diffIsoDays(`${today.slice(0, 4)}-01-01`, today)
      : (RANGE_DAYS[query.range] ?? null);
  const earliest = events.at(-1)?.tradeDate ?? addIsoDays(today, -365);
  const from = days === null ? earliest : addIsoDays(today, -days);
  const terms = holdings.terms.get(id);
  if (!terms) {
    await marketDataService
      .ensureHistory(context.householdId, asset, from, today)
      .catch(() => undefined);
  }
  const chart = terms
    ? []
    : (await marketDataRepository.getPrices(id, from, today)).map((p) => ({
        date: p.date,
        close: d(p.close).toFixed(),
      }));

  const lots = await Promise.all(
    (row?.lots ?? []).map(async (lot) => ({
      lotId: lot.id,
      accountId: lot.accountId,
      acquiredDate: lot.acquiredDate,
      quantity: lot.quantity.toFixed(),
      unitCost: lot.quantity.isZero()
        ? "0"
        : lot.costAsset.div(lot.quantity).toDecimalPlaces(8).toFixed(),
      cost: await scope.fx.minor(lot.costAsset, asset.currencyId),
    })),
  );

  const incomeByMonth = new Map<string, number>();
  for (const { ledger } of holdings.ledgers) {
    for (const rec of ledger.income) {
      if (rec.assetId !== id) continue;
      const month = rec.date.slice(0, 7);
      incomeByMonth.set(
        month,
        (incomeByMonth.get(month) ?? 0) + (await scope.fx.minor(rec.net, asset.currencyId)),
      );
    }
  }

  let fixedIncomeCurve: AssetDetail["fixedIncomeCurve"] = [];
  let fixedIncomeProjection: AssetDetail["fixedIncomeProjection"] = null;
  if (terms && row) {
    const principal = row.lots.reduce((t, l) => t.plus(l.costAsset), ZERO);
    const issue = row.lots.reduce((min, l) => (l.acquiredDate < min ? l.acquiredDate : min), today);
    const domainTerms = {
      indexer: terms.indexer,
      rateForm: terms.rateForm,
      rate: terms.rate,
      dayCount: terms.dayCount,
      issueDate: issue,
      maturityDate: terms.maturityDate ?? today,
    } as FixedIncomeTerms;
    const step = Math.max(1, Math.ceil(diffIsoDays(issue, today) / 90));
    const series = curveSeries(
      principal,
      domainTerms,
      issue,
      today,
      holdings.indexData,
      holdings.calendar,
      step,
    );
    fixedIncomeCurve = await Promise.all(
      series.map(async (p) => ({
        date: p.date,
        value: await scope.fx.minor(p.value, asset.currencyId),
        estimated: p.estimated,
      })),
    );
    if (terms.maturityDate && terms.maturityDate > today) {
      const gross = curveSeries(
        principal,
        domainTerms,
        issue,
        terms.maturityDate,
        holdings.indexData,
        holdings.calendar,
        100000,
      ).at(-1);
      if (gross) {
        const brackets = irBracketTimeline(asset.assetClass, today, holdings.rules);
        fixedIncomeProjection = {
          maturityDate: terms.maturityDate,
          grossValue: await scope.fx.minor(gross.value, asset.currencyId),
          netValue: await scope.fx.minor(gross.value, asset.currencyId),
          taxBrackets: brackets.map((b) => ({
            fromDay: b.fromDay,
            toDay: b.toDay,
            ratePercent: b.rate.mul(100).toFixed(),
          })),
        };
      }
    }
  }

  const fundamentals = terms
    ? null
    : await marketDataService.fundamentals(context.householdId, asset);
  return {
    asset: resource as InvestmentAsset,
    position,
    lots,
    events: events.map((e) => toEventResource(e, asset)),
    chart,
    averageCostLine: row ? row.averageCost.toDecimalPlaces(8).toFixed() : null,
    markers: events
      .filter((e) =>
        [
          "BUY",
          "SELL",
          "SPLIT",
          "REVERSE_SPLIT",
          "BONUS_SHARES",
          "DIVIDEND",
          "JCP",
          "FII_INCOME",
        ].includes(e.type),
      )
      .map((e) => ({
        date: e.tradeDate,
        type: e.type as never,
        price: e.unitPrice ? d(e.unitPrice).toFixed() : null,
        quantity: e.quantity ? d(e.quantity).toFixed() : null,
      })),
    incomeByMonth: [...incomeByMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, net]) => ({ month, net })),
    fundamentals: fundamentals
      ? {
          sector: fundamentals.sector,
          industry: fundamentals.industry,
          description: fundamentals.description,
          website: fundamentals.website,
          marketCap: fundamentals.marketCap,
          dividendYield: fundamentals.dividendYield,
          peRatio: fundamentals.peRatio,
        }
      : null,
    fixedIncomeCurve,
    fixedIncomeProjection,
  };
}

// ---------------------------------------------------------------- providers & refresh

export const listProviders = (context: HouseholdContext) =>
  marketDataService.providerStatuses(context.householdId);

export const updateProvider = (
  context: HouseholdContext,
  providerId: string,
  body: { enabled?: boolean; priority?: number | null; premium?: boolean; apiKey?: string },
) => marketDataService.updateProvider(context.householdId, providerId, body);

export async function refreshPrices(
  context: HouseholdContext,
  body: { accountId?: string; assetId?: string },
) {
  let assets: AssetRecord[];
  if (body.assetId) assets = [await requireAsset(context, body.assetId)];
  else {
    const scope = await resolveScope(context, { accountId: body.accountId });
    const ids = await repo.eventsRepository.assetIdsHeld(
      context,
      scope.accounts.map((a) => a.id),
    );
    assets = await repo.findAssets(context, ids);
  }
  const failures: { symbol: string; message: string }[] = [];
  let quotes = 0;
  for (const asset of assets) {
    if (isFixedIncomeClass(asset.assetClass as never) && asset.assetClass !== "TESOURO_DIRETO")
      continue;
    try {
      const info = await marketDataService.refreshQuote(context.householdId, asset, true);
      if (info) quotes += 1;
    } catch (error) {
      failures.push({
        symbol: asset.symbol,
        message: error instanceof Error ? error.message : "Refresh failed",
      });
    }
  }
  return { quotes, assets: assets.length, failures };
}
