import {
  type BusinessCalendar,
  computeLedger,
  curveValue,
  custodyFee,
  Dec,
  d,
  diffIsoDays,
  type FixedIncomeTerms,
  fixedIncomeRedemptionTax,
  type IndexData,
  isFixedIncomeClass,
  type LedgerResult,
  type Lot,
  ONE,
  type TaxProfile,
  type TaxRules,
  ZERO,
} from "@luraba/domain";
import type { HouseholdContext } from "@/config/permissions";
import { marketDataService, type PriceInfo } from "@/modules/market-data/market-data.service";
import { getCurrencyOrThrow } from "./investments.currency";
import { FxConverter } from "./investments.fx";
import { loadCalendar, loadIndexData, loadTaxRules } from "./investments.macro";
import { toLedgerEvent } from "./investments.mappers";
import * as repo from "./investments.repository";
import type {
  AssetRecord,
  FixedIncomeTermsRecord,
  InvestmentAccountRecord,
  InvestmentEventRecord,
} from "./investments.types";

export type ScopeQuery = { portfolioId?: string; accountId?: string; currencyCode?: string };

export type Scope = {
  context: HouseholdContext;
  accounts: InvestmentAccountRecord[];
  reportingCurrency: string;
  today: string;
  fx: FxConverter;
};

export type AccountLedger = {
  account: InvestmentAccountRecord;
  events: InvestmentEventRecord[];
  ledger: LedgerResult;
};

export type FixedIncomeValuation = {
  terms: FixedIncomeTermsRecord;
  curveValue: Dec;
  marketValue: Dec | null;
  estimated: boolean;
  estimatedIr: Dec;
  estimatedIof: Dec;
  custody: Dec;
  netValue: Dec;
  iofDaysRemaining: number | null;
  nextIrBracketInDays: number | null;
};

export type HoldingRow = {
  asset: AssetRecord;
  accountIds: string[];
  quantity: Dec;
  costAsset: Dec;
  /** Cost converted to the reporting currency through the account base currency. */
  invested: Dec;
  averageCost: Dec;
  price: PriceInfo | null;
  priceStale: boolean;
  /** Reporting-currency amounts. */
  marketValue: Dec;
  netValue: Dec;
  unrealized: Dec;
  fxEffect: Dec;
  realized: Dec;
  income: Dec;
  todayChange: Dec;
  rateToReporting: Dec;
  fixedIncome: FixedIncomeValuation | null;
  lots: (Lot & { accountId: string })[];
};

export type Holdings = {
  scope: Scope;
  rules: TaxRules;
  calendar: BusinessCalendar;
  indexData: IndexData;
  ledgers: AccountLedger[];
  assets: Map<string, AssetRecord>;
  terms: Map<string, FixedIncomeTermsRecord>;
  prices: Map<string, PriceInfo>;
  rows: HoldingRow[];
  closedRealized: Dec;
  /** Cash in the reporting currency across all accounts and cash currencies. */
  cashReporting: Dec;
  cashByCurrency: Map<string, Dec>;
  totalMarketValue: Dec;
  /** Warnings such as missing FX pairs. */
  warnings: string[];
};

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function resolveScope(
  context: HouseholdContext,
  query: ScopeQuery = {},
): Promise<Scope> {
  const settings = await repo.getOrCreateSettings(context, await householdCurrency(context));
  let ids: string[] | undefined;
  let reporting = query.currencyCode ?? settings.reportingCurrencyId;
  if (query.accountId) {
    ids = [query.accountId];
  } else if (query.portfolioId) {
    const portfolio = await repo.portfoliosRepository.get(query.portfolioId, context);
    if (!portfolio) ids = [];
    else {
      reporting = query.currencyCode ?? portfolio.reportingCurrencyId;
      ids = (await repo.portfolioAccountIds(context, portfolio.id)).get(portfolio.id) ?? [];
    }
  }
  const accounts = await repo.listInvestmentAccounts(
    context,
    { costBasisMethod: settings.defaultCostBasisMethod, taxProfile: settings.defaultTaxProfile },
    ids,
  );
  await getCurrencyOrThrow(reporting);
  return {
    context,
    accounts,
    reportingCurrency: reporting,
    today: todayIso(),
    fx: new FxConverter(),
  };
}

async function householdCurrency(context: HouseholdContext): Promise<string> {
  const { householdsTable } = await import("@luraba/db/schemas/households.schema");
  const { db } = await import("@/db");
  const { eq } = await import("drizzle-orm");
  const [row] = await db
    .select({ code: householdsTable.defaultCurrencyId })
    .from(householdsTable)
    .where(eq(householdsTable.id, context.householdId));
  return row?.code ?? "BRL";
}

export function runAccountLedger(
  account: InvestmentAccountRecord,
  events: InvestmentEventRecord[],
  extra: { checkpoints?: string[] } = {},
): LedgerResult {
  return computeLedger(
    events.map((event) => toLedgerEvent(event, account.currencyId)),
    {
      method: account.settings.costBasisMethod as "AVERAGE" | "FIFO" | "SPECIFIC_LOT",
      detectDayTrade: account.settings.taxProfile === "BR_INDIVIDUAL",
      checkpoints: extra.checkpoints,
    },
  );
}

function domainTerms(record: FixedIncomeTermsRecord, issueDate: string): FixedIncomeTerms {
  return {
    indexer: record.indexer as FixedIncomeTerms["indexer"],
    rateForm: record.rateForm as FixedIncomeTerms["rateForm"],
    rate: record.rate,
    dayCount: record.dayCount as FixedIncomeTerms["dayCount"],
    issueDate,
    maturityDate: record.maturityDate ?? "2100-01-01",
  };
}

const IR_BOUNDARIES = [180, 360, 720];

/** Fixed-income valuation of the lots of one account position (asset currency). */
export function valueFixedIncomeLots(input: {
  asset: AssetRecord;
  terms: FixedIncomeTermsRecord;
  lots: Lot[];
  quantity: Dec;
  price: PriceInfo | null;
  today: string;
  indexData: IndexData;
  calendar: BusinessCalendar;
  rules: TaxRules;
  applyExemptions: boolean;
}): FixedIncomeValuation {
  const { asset, terms, lots, today, indexData, calendar, rules } = input;
  let curve = ZERO;
  let estimated = false;
  const lotCurves = lots.map((lot) => {
    const result = curveValue(
      lot.costAsset,
      domainTerms(terms, lot.acquiredDate),
      lot.acquiredDate,
      today,
      indexData,
      calendar,
    );
    curve = curve.plus(result.value);
    estimated = estimated || result.accrual.estimated;
    return result.value;
  });

  const marketValue =
    asset.assetClass === "TESOURO_DIRETO" && input.price && !input.price.isManual
      ? input.quantity.mul(input.price.price)
      : null;
  const gross = marketValue ?? curve;
  let ir = ZERO;
  let iof = ZERO;
  let iofRemaining: number | null = null;
  let nextBracket: number | null = null;
  let youngest = Number.POSITIVE_INFINITY;
  for (let i = 0; i < lots.length; i++) {
    const lot = lots[i] as Lot;
    const lotGross = curve.isZero()
      ? (lotCurves[i] as Dec)
      : (lotCurves[i] as Dec).mul(gross).div(curve);
    const days = diffIsoDays(lot.acquiredDate, today);
    youngest = Math.min(youngest, days);
    const tax = fixedIncomeRedemptionTax({
      principal: lot.costAsset,
      grossValue: lotGross,
      daysHeld: days,
      assetClass: asset.assetClass,
      date: today,
      rules,
      applyExemptions: input.applyExemptions,
    });
    ir = ir.plus(tax.ir);
    iof = iof.plus(tax.iof);
    if (!tax.exempt && days < 30) iofRemaining = Math.max(iofRemaining ?? 0, 30 - days);
  }
  if (
    Number.isFinite(youngest) &&
    input.applyExemptions &&
    !rules.has("BR_FI_IR_EXEMPT", today, { assetClass: asset.assetClass })
  ) {
    const boundary = IR_BOUNDARIES.find((b) => b >= youngest);
    nextBracket = boundary === undefined ? null : boundary + 1 - youngest;
  }

  let custody = ZERO;
  const custodyRule =
    asset.assetClass === "TESOURO_DIRETO"
      ? rules.first("BR_CUSTODY_FEE", today, { assetClass: "TESOURO_DIRETO" })
      : undefined;
  if (custodyRule && terms.indexer !== "SELIC") {
    for (const lot of lots) {
      custody = custody.plus(
        custodyFee(
          gross.mul(lot.costAsset).div(
            Dec.max(
              lots.reduce((a, l) => a.plus(l.costAsset), ZERO),
              ONE,
            ),
          ),
          d(custodyRule.rate),
          calendar.countBusinessDays(lot.acquiredDate, today),
        ),
      );
    }
  }

  return {
    terms,
    curveValue: curve,
    marketValue,
    estimated,
    estimatedIr: ir,
    estimatedIof: iof,
    custody,
    netValue: gross.minus(ir).minus(iof).minus(custody),
    iofDaysRemaining: iofRemaining,
    nextIrBracketInDays: nextBracket,
  };
}

/** Estimated tax on selling the position today (non fixed income), in the asset currency. */
export function estimateSaleTaxAsset(input: {
  profile: TaxProfile;
  asset: AssetRecord;
  lots: Lot[];
  price: Dec;
  today: string;
  rules: TaxRules;
}): Dec {
  const { profile, asset, lots, price, today, rules } = input;
  if (profile === "NONE" || profile === "US_NONRESIDENT") return ZERO;
  let total = ZERO;
  for (const lot of lots) {
    const gain = lot.quantity.mul(price).minus(lot.costAsset);
    if (gain.lte(0)) continue;
    if (profile === "US_RESIDENT") {
      const term =
        diffIsoDays(lot.acquiredDate, today) >
        (rules.threshold("US_LONG_TERM_DAYS", today).toNumber() || 365)
          ? "LONG"
          : "SHORT";
      const row = rules.find("US_CAPITAL_GAINS", today).find((r) => r.params?.term === term);
      total = total.plus(gain.mul(d(row?.rate)));
    } else if (asset.country && asset.country !== "BR") {
      total = total.plus(gain.mul(rules.rate("BR_OFFSHORE_FLAT", today)));
    } else {
      const fii = asset.assetClass === "FII" || asset.assetClass === "FIAGRO";
      total = total.plus(
        gain.mul(rules.rate("BR_VAR_RATE", today, { bucket: fii ? "FII_SWING" : "COMMON_SWING" })),
      );
    }
  }
  return total;
}

function ageOfPrice(price: PriceInfo | null, today: string): boolean {
  if (!price) return true;
  if (price.isManual) return false;
  return diffIsoDays(price.asOf.toISOString().slice(0, 10), today) > 4;
}

export async function loadAccountLedgers(scope: Scope): Promise<AccountLedger[]> {
  const events = await repo.eventsRepository.listForEngine(
    scope.context,
    scope.accounts.map((a) => a.id),
  );
  const byAccount = new Map<string, InvestmentEventRecord[]>();
  for (const event of events)
    byAccount.set(event.accountId, [...(byAccount.get(event.accountId) ?? []), event]);
  return scope.accounts.map((account) => {
    const accountEvents = byAccount.get(account.id) ?? [];
    return { account, events: accountEvents, ledger: runAccountLedger(account, accountEvents) };
  });
}

export async function computeHoldings(scope: Scope): Promise<Holdings> {
  const { fx, today, reportingCurrency } = scope;
  const [rules, calendar, ledgers] = await Promise.all([
    loadTaxRules(),
    loadCalendar(),
    loadAccountLedgers(scope),
  ]);

  const assetIds = new Set<string>();
  for (const { events } of ledgers) for (const e of events) if (e.assetId) assetIds.add(e.assetId);
  const assetList = await repo.findAssets(scope.context, [...assetIds]);
  const assets = new Map(assetList.map((a) => [a.id, a]));
  const [terms, prices, overrides] = await Promise.all([
    repo.getFixedIncomeTerms(
      assetList.filter((a) => isFixedIncomeClass(a.assetClass as never)).map((a) => a.id),
    ),
    marketDataService.latestPrices(assetList),
    repo.getHouseholdAssetSettings(scope.context, [...assetIds]),
  ]);
  const earliest = ledgers
    .flatMap((l) => l.events)
    .reduce((min, e) => (e.tradeDate < min ? e.tradeDate : min), today);
  const indexData = terms.size > 0 ? await loadIndexData(earliest) : await loadIndexData(today);

  const merged = new Map<string, HoldingRow>();
  let closedRealized = ZERO;
  const cashByCurrency = new Map<string, Dec>();

  for (const { account, ledger } of ledgers) {
    const accountRate = await fx.rateOrOne(account.currencyId, reportingCurrency, today);
    for (const [currency, amount] of Object.entries(ledger.cash)) {
      cashByCurrency.set(currency, (cashByCurrency.get(currency) ?? ZERO).plus(amount));
    }
    for (const position of ledger.positions.values()) {
      const asset = assets.get(position.assetId);
      if (!asset) continue;
      const assetRate = await fx.rateOrOne(asset.currencyId, reportingCurrency, today);
      const realized = position.realizedBase.mul(accountRate);
      if (position.quantity.isZero()) {
        closedRealized = closedRealized.plus(realized);
        continue;
      }
      const price = prices.get(asset.id) ?? null;
      const invested = position.costBase.mul(accountRate);
      const profile = account.settings.taxProfile as TaxProfile;
      const accountLots = position.lots.map((lot) => ({ ...lot, accountId: account.id }));

      let marketValueAsset: Dec;
      let netAsset: Dec;
      let fixedIncome: FixedIncomeValuation | null = null;
      const fiTerms = terms.get(asset.id);
      if (fiTerms) {
        fixedIncome = valueFixedIncomeLots({
          asset,
          terms: fiTerms,
          lots: position.lots,
          quantity: position.quantity,
          price,
          today,
          indexData,
          calendar,
          rules,
          applyExemptions: profile === "BR_INDIVIDUAL",
        });
        marketValueAsset = fixedIncome.marketValue ?? fixedIncome.curveValue;
        netAsset =
          profile === "NONE" || profile.startsWith("US_") ? marketValueAsset : fixedIncome.netValue;
      } else {
        const unit = price?.price ?? position.avgCostAsset;
        marketValueAsset = position.quantity.mul(unit);
        netAsset = marketValueAsset.minus(
          estimateSaleTaxAsset({ profile, asset, lots: position.lots, price: unit, today, rules }),
        );
      }

      const marketValue = marketValueAsset.mul(assetRate);
      const unrealized = marketValue.minus(invested);
      const fxEffect = position.costAsset.mul(assetRate).minus(invested);
      const todayChange =
        !fiTerms && price?.change ? position.quantity.mul(price.change).mul(assetRate) : ZERO;
      const income = position.incomeNetAsset.mul(assetRate);

      const existing = merged.get(asset.id);
      if (!existing) {
        merged.set(asset.id, {
          asset: {
            ...asset,
            sector: overrides.get(asset.id)?.sector ?? asset.sector,
            industry: overrides.get(asset.id)?.industry ?? asset.industry,
          },
          accountIds: [account.id],
          quantity: position.quantity,
          costAsset: position.costAsset,
          invested,
          averageCost: position.avgCostAsset,
          price,
          priceStale: ageOfPrice(price, today) && !fiTerms,
          marketValue,
          netValue: netAsset.mul(assetRate),
          unrealized,
          fxEffect,
          realized,
          income,
          todayChange,
          rateToReporting: assetRate,
          fixedIncome,
          lots: accountLots,
        });
      } else {
        existing.accountIds.push(account.id);
        existing.quantity = existing.quantity.plus(position.quantity);
        existing.costAsset = existing.costAsset.plus(position.costAsset);
        existing.invested = existing.invested.plus(invested);
        existing.averageCost = existing.costAsset.div(existing.quantity);
        existing.marketValue = existing.marketValue.plus(marketValue);
        existing.netValue = existing.netValue.plus(netAsset.mul(assetRate));
        existing.unrealized = existing.unrealized.plus(unrealized);
        existing.fxEffect = existing.fxEffect.plus(fxEffect);
        existing.realized = existing.realized.plus(realized);
        existing.income = existing.income.plus(income);
        existing.todayChange = existing.todayChange.plus(todayChange);
        existing.lots.push(...accountLots);
        if (fixedIncome && existing.fixedIncome) {
          existing.fixedIncome = {
            ...existing.fixedIncome,
            curveValue: existing.fixedIncome.curveValue.plus(fixedIncome.curveValue),
            marketValue:
              existing.fixedIncome.marketValue && fixedIncome.marketValue
                ? existing.fixedIncome.marketValue.plus(fixedIncome.marketValue)
                : (existing.fixedIncome.marketValue ?? fixedIncome.marketValue),
            estimatedIr: existing.fixedIncome.estimatedIr.plus(fixedIncome.estimatedIr),
            estimatedIof: existing.fixedIncome.estimatedIof.plus(fixedIncome.estimatedIof),
            custody: existing.fixedIncome.custody.plus(fixedIncome.custody),
            netValue: existing.fixedIncome.netValue.plus(fixedIncome.netValue),
          };
        }
      }
    }
  }

  const rows = [...merged.values()].sort((a, b) => b.marketValue.comparedTo(a.marketValue));
  let cashReporting = ZERO;
  for (const [currency, amount] of cashByCurrency) {
    cashReporting = cashReporting.plus(
      amount.mul(await fx.rateOrOne(currency, reportingCurrency, today)),
    );
  }
  const totalMarketValue = rows.reduce((total, row) => total.plus(row.marketValue), ZERO);
  const warnings = [...fx.missing].map((pair) => `No exchange rate for ${pair}; values use 1:1`);
  return {
    scope,
    rules,
    calendar,
    indexData,
    ledgers,
    assets,
    terms,
    prices,
    rows,
    closedRealized,
    cashReporting,
    cashByCurrency,
    totalMarketValue,
    warnings,
  };
}

/** Account value in the account currency (cash + positions), used by the accounts list / net worth. */
const totalsCache = new Map<
  string,
  {
    at: number;
    value: {
      positionsValue: number;
      totalValue: number;
      cash: { currencyCode: string; amount: number }[];
    };
  }
>();
const TOTALS_TTL_MS = 10_000;

export function invalidateAccountTotals(accountId?: string): void {
  if (accountId) totalsCache.delete(accountId);
  else totalsCache.clear();
}

export async function accountTotals(context: HouseholdContext, accountId: string) {
  const cached = totalsCache.get(accountId);
  if (cached && Date.now() - cached.at < TOTALS_TTL_MS) return cached.value;
  const base = await resolveScope(context, { accountId });
  const account = base.accounts[0];
  if (!account) return null;
  const scope = { ...base, reportingCurrency: account.currencyId };
  const holdings = await computeHoldings(scope);
  const cash: { currencyCode: string; amount: number }[] = [];
  for (const [currency, amount] of holdings.cashByCurrency) {
    cash.push({ currencyCode: currency, amount: await scope.fx.minor(amount, currency) });
  }
  const positionsValue = await scope.fx.minor(holdings.totalMarketValue, account.currencyId);
  const value = {
    positionsValue,
    totalValue: await scope.fx.minor(
      holdings.totalMarketValue.plus(holdings.cashReporting),
      account.currencyId,
    ),
    cash,
  };
  totalsCache.set(accountId, { at: Date.now(), value });
  return value;
}
