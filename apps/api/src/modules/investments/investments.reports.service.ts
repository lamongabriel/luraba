import type {
  AllocationReport,
  IncomeReport,
  InvestmentDashboard,
  InvestmentPosition,
  RebalanceReport,
  TaxReport,
} from "@luraba/contracts/investments";
import {
  type ApuracaoLine,
  addIsoDays,
  allocate,
  type Bucket,
  bucketOf,
  calculateApuracao,
  curveValue,
  type Dec,
  d,
  diffIsoDays,
  estimateDedoDuro,
  type FixedIncomeTerms,
  isFixedIncomeClass,
  type LedgerSnapshot,
  ONE,
  offshoreFlatTax,
  type PerformancePeriod,
  periodStart,
  rebalanceWithContribution,
  seriesReturn,
  TAX_DISCLAIMER,
  type TaxProfile,
  type TaxSale,
  timeWeightedReturn,
  usRealizedGains,
  type ValuePoint,
  xirr,
  ZERO,
} from "@luraba/domain";
import type { HouseholdContext } from "@/config/permissions";
import { marketDataRepository } from "@/modules/market-data/market-data.repository";
import { NotFoundError } from "@/shared/errors";
import { loadIndexData } from "./investments.macro";
import * as repo from "./investments.repository";
import {
  computeHoldings,
  type HoldingRow,
  type Holdings,
  resolveScope,
  runAccountLedger,
  type Scope,
  type ScopeQuery,
} from "./investments.valuation";

const pct = (value: Dec): string => value.toDecimalPlaces(4).toFixed();

async function money(scope: Scope, amount: Dec): Promise<number> {
  return scope.fx.minor(amount, scope.reportingCurrency);
}

// ---------------------------------------------------------------- positions

export async function toPosition(
  scope: Scope,
  row: HoldingRow,
  total: Dec,
  net: boolean,
): Promise<InvestmentPosition> {
  const { asset } = row;
  const fi = row.fixedIncome;
  const marketValue = net ? row.netValue : row.marketValue;
  const unrealized = marketValue.minus(row.invested);
  return {
    assetId: asset.id,
    symbol: asset.symbol,
    name: asset.name,
    assetClass: asset.assetClass as InvestmentPosition["assetClass"],
    country: asset.country,
    sector: asset.sector,
    industry: asset.industry,
    currencyCode: asset.currencyId,
    accountIds: row.accountIds,
    quantity: row.quantity.toFixed(),
    averageCost: row.averageCost.toDecimalPlaces(8).toFixed(),
    price: row.price
      ? {
          price: row.price.price.toFixed(),
          currencyCode: row.price.currency,
          asOf: row.price.asOf.toISOString(),
          provider: row.price.provider,
          isDelayed: row.price.isDelayed,
          isManual: row.price.isManual,
          isStale: row.priceStale,
          change: row.price.change?.toFixed() ?? null,
          changePercent: row.price.changePercent?.toFixed() ?? null,
        }
      : null,
    invested: await money(scope, row.invested),
    marketValue: await money(scope, marketValue),
    netValue: await money(scope, row.netValue),
    unrealizedPnl: await money(scope, unrealized),
    unrealizedPnlPercent: pct(row.invested.isZero() ? ZERO : unrealized.div(row.invested).mul(100)),
    fxEffect: await money(scope, row.fxEffect),
    realizedPnl: await money(scope, row.realized),
    income: await money(scope, row.income),
    todayChange: await money(scope, row.todayChange),
    percentOfPortfolio: pct(total.isZero() ? ZERO : marketValue.div(total).mul(100)),
    fixedIncome: fi
      ? {
          indexer: fi.terms.indexer as never,
          rateForm: fi.terms.rateForm as never,
          rate: d(fi.terms.rate).toFixed(),
          maturityDate: fi.terms.maturityDate,
          daysToMaturity: fi.terms.maturityDate
            ? diffIsoDays(scope.today, fi.terms.maturityDate)
            : null,
          curveValue: await money(scope, fi.curveValue.mul(row.rateToReporting)),
          marketValue: fi.marketValue
            ? await money(scope, fi.marketValue.mul(row.rateToReporting))
            : null,
          accruedIsEstimated: fi.estimated,
          estimatedIr: await money(scope, fi.estimatedIr.mul(row.rateToReporting)),
          estimatedIof: await money(scope, fi.estimatedIof.mul(row.rateToReporting)),
          netValue: await money(scope, fi.netValue.mul(row.rateToReporting)),
          iofDaysRemaining: fi.iofDaysRemaining,
          nextIrBracketInDays: fi.nextIrBracketInDays,
          fgcCovered: fi.terms.fgcCovered,
        }
      : null,
  };
}

export async function listPositions(
  context: HouseholdContext,
  query: ScopeQuery & { net?: boolean },
) {
  const scope = await resolveScope(context, query);
  const holdings = await computeHoldings(scope);
  const total = query.net
    ? holdings.rows.reduce((t, r) => t.plus(r.netValue), ZERO)
    : holdings.totalMarketValue;
  return Promise.all(holdings.rows.map((row) => toPosition(scope, row, total, query.net ?? false)));
}

// ---------------------------------------------------------------- history / performance

const MAX_POINTS = 90;

function sampleDates(from: string, to: string): string[] {
  const span = Math.max(1, diffIsoDays(from, to));
  const step = Math.max(1, Math.ceil(span / MAX_POINTS));
  const dates: string[] = [];
  for (let date = from; date < to; date = addIsoDays(date, step)) dates.push(date);
  dates.push(to);
  return dates;
}

type Series = {
  points: ValuePoint[];
  invested: Dec[];
  flows: { date: string; amount: Dec }[];
  dates: string[];
};

async function buildSeries(scope: Scope, holdings: Holdings, from: string): Promise<Series> {
  const { today, fx, reportingCurrency } = scope;
  const dates = sampleDates(from, today);
  const assetIds = [...holdings.assets.keys()];
  const prices = await marketDataRepository.getPricesForAssets(
    assetIds,
    addIsoDays(from, -10),
    today,
  );
  const priceAt = (assetId: string, date: string): Dec | null => {
    const list = prices.get(assetId);
    if (!list) return null;
    let found: Dec | null = null;
    for (const p of list) {
      if (p.date <= date) found = d(p.close);
      else break;
    }
    return found;
  };

  const perAccount = holdings.ledgers.map(({ account, events }) => ({
    account,
    events,
    result: runAccountLedger(account, events, { checkpoints: dates }),
  }));
  const hasCashFlows = holdings.ledgers.some(({ events }) =>
    events.some(
      (e) =>
        e.type === "DEPOSIT" ||
        e.type === "TRANSFER_IN" ||
        e.type === "WITHDRAWAL" ||
        e.type === "TRANSFER_OUT",
    ),
  );

  const flows: { date: string; amount: Dec }[] = [];
  const flowByDate = new Map<string, Dec>();
  for (const { account, events } of perAccount) {
    for (const e of events) {
      if (e.tradeDate > today) continue;
      let sign = 0;
      let amount = d(e.netAmount);
      if (hasCashFlows) {
        if (e.type === "DEPOSIT" || e.type === "TRANSFER_IN") sign = 1;
        else if (e.type === "WITHDRAWAL" || e.type === "TRANSFER_OUT") sign = -1;
      } else if (e.type === "BUY" || e.type === "SUBSCRIPTION" || e.type === "FI_APPLICATION")
        sign = 1;
      else if (e.type === "SELL" || e.type === "FI_REDEMPTION" || e.type === "FI_MATURITY")
        sign = -1;
      if (sign === 0) continue;
      const rate = d(e.fxRateToAccountBase ?? "1");
      amount = amount
        .mul(rate)
        .mul(await fx.rateOrOne(account.currencyId, reportingCurrency, e.tradeDate));
      const signed = amount.mul(sign);
      flowByDate.set(e.tradeDate, (flowByDate.get(e.tradeDate) ?? ZERO).plus(signed));
      flows.push({ date: e.tradeDate, amount: signed });
    }
  }

  const points: ValuePoint[] = [];
  const invested: Dec[] = [];
  let previousDate = addIsoDays(from, -1);
  for (const date of dates) {
    let value = ZERO;
    let cost = ZERO;
    for (const { account, result } of perAccount) {
      const snapshot: LedgerSnapshot | undefined = [...result.snapshots]
        .reverse()
        .find((s) => s.date <= date);
      if (!snapshot) continue;
      const accountRate = await fx.rateOrOne(account.currencyId, reportingCurrency, date);
      for (const position of snapshot.positions) {
        if (position.quantity.isZero()) continue;
        const asset = holdings.assets.get(position.assetId);
        if (!asset) continue;
        const assetRate = await fx.rateOrOne(asset.currencyId, reportingCurrency, date);
        const terms = holdings.terms.get(asset.id);
        let assetValue: Dec;
        if (terms) {
          assetValue = ZERO;
          for (const lot of position.lots) {
            assetValue = assetValue.plus(
              curveValue(
                lot.costAsset,
                {
                  indexer: terms.indexer,
                  rateForm: terms.rateForm,
                  rate: terms.rate,
                  dayCount: terms.dayCount,
                  issueDate: lot.acquiredDate,
                  maturityDate: terms.maturityDate ?? "2100-01-01",
                } as FixedIncomeTerms,
                lot.acquiredDate,
                date,
                holdings.indexData,
                holdings.calendar,
              ).value,
            );
          }
        } else {
          const price = priceAt(asset.id, date);
          assetValue = price ? position.quantity.mul(price) : position.costAsset;
        }
        value = value.plus(assetValue.mul(assetRate));
        cost = cost.plus(position.costBase.mul(accountRate));
      }
      if (hasCashFlows) {
        for (const [currency, amount] of Object.entries(snapshot.cash)) {
          value = value.plus(amount.mul(await fx.rateOrOne(currency, reportingCurrency, date)));
        }
      }
    }
    let flow = ZERO;
    for (const [flowDate, amount] of flowByDate)
      if (flowDate > previousDate && flowDate <= date) flow = flow.plus(amount);
    points.push({ date, value, flow });
    invested.push(cost);
    previousDate = date;
  }
  return { points, invested, flows, dates };
}

async function benchmarkLevels(
  benchmark: string,
  from: string,
  to: string,
): Promise<{ date: string; value: Dec }[] | null> {
  if (benchmark === "CDI" || benchmark === "IPCA" || benchmark === "IPCA_PLUS_6") {
    const series = benchmark === "CDI" ? "CDI_DAILY" : "IPCA_MONTHLY";
    const points = await marketDataRepository.getMacro(series, addIsoDays(from, -35), to);
    let level = ONE;
    const levels: { date: string; value: Dec }[] = [];
    for (const p of points) {
      level = level.mul(ONE.plus(d(p.value).div(100)));
      if (benchmark === "IPCA_PLUS_6") level = level.mul(ONE.plus(d("0.06")).pow(ONE.div(12)));
      levels.push({ date: p.date, value: level });
    }
    return levels.length > 0 ? levels : null;
  }
  const symbol = benchmark === "IBOVESPA" ? "^BVSP" : benchmark === "IFIX" ? "IFIX" : "^GSPC";
  const asset = await repo.findBenchmarkAsset(symbol);
  if (!asset) return null;
  const rows = await marketDataRepository.getPrices(asset.id, addIsoDays(from, -10), to);
  return rows.length > 0 ? rows.map((r) => ({ date: r.date, value: d(r.close) })) : null;
}

export async function dashboard(
  context: HouseholdContext,
  query: ScopeQuery & { net?: boolean; period?: PerformancePeriod; benchmark?: string },
): Promise<InvestmentDashboard> {
  const scope = await resolveScope(context, query);
  const holdings = await computeHoldings(scope);
  const net = query.net ?? false;
  const { rows } = holdings;
  const today = scope.today;
  const earliest = holdings.ledgers
    .flatMap((l) => l.events)
    .reduce((min, e) => (e.tradeDate < min ? e.tradeDate : min), today);
  const from = periodStart(query.period ?? "1Y", today, earliest);

  const value = (row: HoldingRow) => (net ? row.netValue : row.marketValue);
  const marketValue = rows.reduce((t, r) => t.plus(value(r)), ZERO);
  const invested = rows.reduce((t, r) => t.plus(r.invested), ZERO);
  const unrealized = marketValue.minus(invested);
  const todayChange = rows.reduce((t, r) => t.plus(r.todayChange), ZERO);
  const realized = rows.reduce((t, r) => t.plus(r.realized), holdings.closedRealized);

  const series = await buildSeries(scope, holdings, from);
  const bench = query.benchmark ? await benchmarkLevels(query.benchmark, from, today) : null;
  const twr = series.points.length > 1 ? timeWeightedReturn(series.points).total : null;
  const last = series.points[series.points.length - 1];
  const first = series.points[0];
  // The opening value already includes any flow on its own day, so only later flows are added.
  const xirrFlows = series.flows
    .filter((f) => !first || f.date > first.date)
    .map((f) => ({ date: f.date, amount: f.amount.neg() }));
  if (first && first.value.gt(0))
    xirrFlows.unshift({ date: first.date, amount: first.value.neg() });
  if (last) xirrFlows.push({ date: today, amount: last.value });
  const irr = xirr(xirrFlows);
  const benchmarkReturn = bench ? seriesReturn(bench, from, today) : null;

  const history = await Promise.all(
    series.points.map(async (point, i) => ({
      date: point.date,
      value: await money(scope, point.value),
      invested: await money(scope, series.invested[i] as Dec),
      benchmark:
        bench && first && first.value.gt(0)
          ? await money(
              scope,
              first.value.mul(ONE.plus(seriesReturn(bench, from, point.date) ?? ZERO)),
            )
          : null,
    })),
  );

  const slices = async (
    key: (row: HoldingRow) => string,
    label: (k: string) => string = (k) => k,
  ) =>
    Promise.all(
      allocate(rows.map((row) => ({ key: key(row), value: value(row) }))).map(async (slice) => ({
        key: slice.key,
        label: label(slice.key),
        value: await money(scope, slice.value),
        percent: pct(slice.percent),
      })),
    );

  // income totals
  const incomeRecords = holdings.ledgers.flatMap(({ account, ledger }) =>
    ledger.income.map((rec) => ({ rec, account })),
  );
  const monthStart = `${today.slice(0, 7)}-01`;
  const yearStart = `${today.slice(0, 4)}-01-01`;
  const yearAgo = addIsoDays(today, -365);
  let m = ZERO;
  let y = ZERO;
  let l12 = ZERO;
  for (const { rec, account } of incomeRecords) {
    const amount = rec.netBase.mul(
      await scope.fx.rateOrOne(account.currencyId, scope.reportingCurrency, rec.date),
    );
    if (rec.date >= monthStart) m = m.plus(amount);
    if (rec.date >= yearStart) y = y.plus(amount);
    if (rec.date >= yearAgo) l12 = l12.plus(amount);
  }

  const movers = await Promise.all(
    rows
      .filter((r) => r.price?.changePercent)
      .sort((a, b) =>
        (b.price?.changePercent ?? ZERO).abs().comparedTo((a.price?.changePercent ?? ZERO).abs()),
      )
      .slice(0, 5)
      .map(async (r) => ({
        assetId: r.asset.id,
        symbol: r.asset.symbol,
        changePercent: pct(r.price?.changePercent as Dec),
        changeValue: await money(scope, r.todayChange),
      })),
  );

  const upcoming: InvestmentDashboard["upcoming"] = [];
  for (const row of rows) {
    const maturity = row.fixedIncome?.terms.maturityDate;
    if (maturity && maturity >= today && diffIsoDays(today, maturity) <= 365) {
      upcoming.push({
        date: maturity,
        kind: "maturity",
        assetId: row.asset.id,
        symbol: row.asset.symbol,
        amount: await money(scope, row.fixedIncome?.curveValue.mul(row.rateToReporting) ?? ZERO),
      });
    }
  }
  upcoming.sort((a, b) => a.date.localeCompare(b.date));

  const asOfs = rows.map((r) => r.price?.asOf).filter((x): x is Date => !!x);
  const oldest = asOfs.length ? new Date(Math.min(...asOfs.map((x) => x.getTime()))) : null;

  return {
    reportingCurrencyCode: scope.reportingCurrency,
    net,
    invested: await money(scope, invested),
    marketValue: await money(scope, marketValue),
    netValue: await money(
      scope,
      rows.reduce((t, r) => t.plus(r.netValue), ZERO),
    ),
    cash: await money(scope, holdings.cashReporting),
    unrealizedPnl: await money(scope, unrealized),
    unrealizedPnlPercent: pct(invested.isZero() ? ZERO : unrealized.div(invested).mul(100)),
    realizedPnl: await money(scope, realized),
    todayChange: await money(scope, todayChange),
    todayChangePercent: pct(
      marketValue.isZero()
        ? ZERO
        : todayChange
            .div(marketValue.minus(todayChange).isZero() ? ONE : marketValue.minus(todayChange))
            .mul(100),
    ),
    income: {
      month: await money(scope, m),
      ytd: await money(scope, y),
      last12Months: await money(scope, l12),
    },
    twr: twr ? pct(twr.mul(100)) : null,
    xirr: irr ? pct(irr.mul(100)) : null,
    benchmarkReturn: benchmarkReturn ? pct(benchmarkReturn.mul(100)) : null,
    history,
    allocation: {
      class: await slices((r) => r.asset.assetClass),
      sector: await slices((r) => r.asset.sector ?? "Unclassified"),
      country: await slices((r) => r.asset.country ?? "Unknown"),
      currency: await slices((r) => r.asset.currencyId),
    },
    movers,
    upcoming,
    priceFreshness: {
      oldestAsOf: oldest ? oldest.toISOString() : null,
      providers: [...new Set(rows.map((r) => r.price?.provider).filter((x): x is string => !!x))],
      staleAssets: rows.filter((r) => r.priceStale).length,
      refreshing: holdings.refreshing,
    },
    disclaimer: TAX_DISCLAIMER,
  };
}

// ---------------------------------------------------------------- income

export async function income(
  context: HouseholdContext,
  query: ScopeQuery & { from?: string; to?: string },
): Promise<IncomeReport> {
  const scope = await resolveScope(context, query);
  const holdings = await computeHoldings(scope);
  const rows: IncomeReport["rows"] = [];
  const byMonth = new Map<string, { gross: Dec; withheld: Dec; net: Dec }>();
  const byAsset = new Map<string, { assetId: string | null; symbol: string; net: Dec }>();
  const byType = new Map<string, Dec>();
  let totalGross = ZERO;
  let totalWithheld = ZERO;
  for (const { account, ledger } of holdings.ledgers) {
    for (const rec of ledger.income) {
      if (query.from && rec.date < query.from) continue;
      if (query.to && rec.date > query.to) continue;
      const rate = await scope.fx.rateOrOne(rec.currency, scope.reportingCurrency, rec.date);
      void account;
      const symbol = rec.assetId ? (holdings.assets.get(rec.assetId)?.symbol ?? "?") : "—";
      rows.push({
        eventId: rec.eventId,
        date: rec.date,
        assetId: rec.assetId,
        symbol: rec.assetId ? symbol : null,
        type: rec.type as never,
        currencyCode: scope.reportingCurrency,
        gross: await money(scope, rec.gross.mul(rate)),
        withheld: await money(scope, rec.withheld.mul(rate)),
        net: await money(scope, rec.net.mul(rate)),
      });
      const month = rec.date.slice(0, 7);
      const m = byMonth.get(month) ?? { gross: ZERO, withheld: ZERO, net: ZERO };
      byMonth.set(month, {
        gross: m.gross.plus(rec.gross.mul(rate)),
        withheld: m.withheld.plus(rec.withheld.mul(rate)),
        net: m.net.plus(rec.net.mul(rate)),
      });
      const a = byAsset.get(symbol) ?? { assetId: rec.assetId, symbol, net: ZERO };
      byAsset.set(symbol, { ...a, net: a.net.plus(rec.net.mul(rate)) });
      byType.set(rec.type, (byType.get(rec.type) ?? ZERO).plus(rec.net.mul(rate)));
      totalGross = totalGross.plus(rec.gross.mul(rate));
      totalWithheld = totalWithheld.plus(rec.withheld.mul(rate));
    }
  }
  rows.sort((a, b) => b.date.localeCompare(a.date));
  return {
    reportingCurrencyCode: scope.reportingCurrency,
    rows,
    byMonth: await Promise.all(
      [...byMonth.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(async ([month, v]) => ({
          month,
          gross: await money(scope, v.gross),
          withheld: await money(scope, v.withheld),
          net: await money(scope, v.net),
        })),
    ),
    byAsset: await Promise.all(
      [...byAsset.values()]
        .sort((a, b) => b.net.comparedTo(a.net))
        .map(async (v) => ({
          assetId: v.assetId,
          symbol: v.symbol,
          net: await money(scope, v.net),
        })),
    ),
    byType: await Promise.all(
      [...byType.entries()].map(async ([type, net]) => ({
        type: type as never,
        net: await money(scope, net),
      })),
    ),
    totalGross: await money(scope, totalGross),
    totalWithheld: await money(scope, totalWithheld),
    totalNet: await money(scope, totalGross.minus(totalWithheld)),
  };
}

// ---------------------------------------------------------------- taxes

export async function taxes(
  context: HouseholdContext,
  query: { year: number; accountId?: string },
): Promise<TaxReport> {
  const scope = await resolveScope(context, { accountId: query.accountId, currencyCode: "BRL" });
  const holdings = await computeHoldings(scope);
  const { rules, calendar } = holdings;
  const brlScope = scope;
  const yearPrefix = `${query.year}`;
  const profile = (holdings.ledgers[0]?.account.settings.taxProfile ??
    "BR_INDIVIDUAL") as TaxProfile;

  const taxSales: TaxSale[] = [];
  const usGains = [];
  let offshoreGain = ZERO;
  for (const { account, ledger } of holdings.ledgers) {
    const accountProfile = account.settings.taxProfile as TaxProfile;
    for (const sale of ledger.sales) {
      const asset = holdings.assets.get(sale.assetId);
      if (!asset) continue;
      if (
        accountProfile === "BR_INDIVIDUAL" &&
        (!asset.country || asset.country === "BR") &&
        bucketOf(asset.assetClass, sale.category)
      ) {
        const rate = await scope.fx.rateOrOne(account.currencyId, "BRL", sale.date);
        const taxSale: TaxSale = {
          eventId: sale.eventId,
          assetId: sale.assetId,
          assetClass: asset.assetClass,
          date: sale.date,
          category: sale.category,
          grossBase: sale.grossBase.mul(rate),
          pnlBase: sale.pnlBase.mul(rate),
          irrfBase: ZERO,
        };
        taxSale.irrfBase = estimateDedoDuro(taxSale, rules);
        taxSales.push(taxSale);
      } else if (accountProfile === "BR_INDIVIDUAL" && sale.date.startsWith(yearPrefix)) {
        offshoreGain = offshoreGain.plus(
          sale.pnlBase.mul(await scope.fx.rateOrOne(account.currencyId, "BRL", sale.date)),
        );
      }
      if (
        sale.date.startsWith(yearPrefix) &&
        (accountProfile === "US_RESIDENT" || accountProfile === "US_NONRESIDENT")
      ) {
        for (const g of usRealizedGains([sale], accountProfile, rules)) {
          usGains.push({
            saleEventId: g.saleEventId,
            assetId: g.assetId,
            symbol: asset.symbol,
            quantity: g.quantity.toFixed(),
            acquiredDate: g.acquiredDate,
            saleDate: g.saleDate,
            proceeds: await scope.fx.minor(g.proceeds, asset.currencyId),
            cost: await scope.fx.minor(g.cost, asset.currencyId),
            gain: await scope.fx.minor(g.gain, asset.currencyId),
            daysHeld: g.daysHeld,
            term: g.term,
            estimatedTax: await scope.fx.minor(g.estimatedTax, asset.currencyId),
            currencyCode: asset.currencyId,
          });
        }
      }
    }
  }

  const accountIds = holdings.ledgers.map((l) => l.account.id);
  const paid = await repo.listDarfPayments(context, accountIds, yearPrefix);
  const lines = calculateApuracao(taxSales, rules, calendar).filter((line: ApuracaoLine) =>
    line.month.startsWith(yearPrefix),
  );
  const apuracao: TaxReport["apuracao"] = [];
  for (const line of lines) {
    const payment = paid.find((p) => p.month === line.month && p.bucket === line.bucket);
    apuracao.push(await lineResource(brlScope, line, payment ? { amount: payment.amount } : null));
  }

  // annual summary
  const endOfYear = `${query.year}-12-31`;
  const holdingsAtCost: TaxReport["annual"]["holdingsAtCost"] = [];
  for (const { account, events } of holdings.ledgers) {
    const result = runAccountLedger(
      account,
      events.filter((e) => e.tradeDate <= endOfYear),
    );
    for (const position of result.positions.values()) {
      if (position.quantity.isZero()) continue;
      const asset = holdings.assets.get(position.assetId);
      if (!asset) continue;
      holdingsAtCost.push({
        assetId: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        assetClass: asset.assetClass as never,
        quantity: position.quantity.toFixed(),
        cost: await scope.fx.minor(
          position.costBase.mul(await scope.fx.rateOrOne(account.currencyId, "BRL", endOfYear)),
          "BRL",
        ),
        currencyCode: "BRL",
      });
    }
  }
  let exempt = ZERO;
  let taxedAtSource = ZERO;
  let exclusive = ZERO;
  for (const { account, ledger } of holdings.ledgers) {
    for (const rec of ledger.income) {
      if (!rec.date.startsWith(yearPrefix)) continue;
      const rate = await scope.fx.rateOrOne(rec.currency, "BRL", rec.date);
      if (rec.type === "JCP") exclusive = exclusive.plus(rec.gross.mul(rate));
      else if (rec.type === "DIVIDEND" || rec.type === "FII_INCOME")
        exempt = exempt.plus(rec.gross.mul(rate));
      taxedAtSource = taxedAtSource.plus(rec.withheld.mul(rate));
      void account;
    }
  }
  const realizedResult = holdings.ledgers.reduce(
    (t, l) =>
      l.ledger.sales
        .filter((s) => s.date.startsWith(yearPrefix))
        .reduce((x, s) => x.plus(s.pnlBase), t),
    ZERO,
  );
  const offshoreTax = offshoreFlatTax(offshoreGain, ZERO, endOfYear, rules);

  return {
    year: query.year,
    profile,
    apuracao,
    usGains,
    annual: {
      year: query.year,
      reportingCurrencyCode: "BRL",
      holdingsAtCost,
      exemptIncome: await scope.fx.minor(exempt, "BRL"),
      taxedAtSource: await scope.fx.minor(taxedAtSource, "BRL"),
      exclusiveTaxIncome: await scope.fx.minor(exclusive, "BRL"),
      realizedResult: await scope.fx.minor(realizedResult, "BRL"),
      offshoreEstimatedTax: await scope.fx.minor(offshoreTax, "BRL"),
    },
    disclaimer: TAX_DISCLAIMER,
  };
}

async function lineResource(
  scope: Scope,
  line: ApuracaoLine,
  paid: { amount: string } | null,
): Promise<TaxReport["apuracao"][number]> {
  const m = (v: Dec) => scope.fx.minor(v, "BRL");
  return {
    month: line.month,
    bucket: line.bucket as Bucket,
    salesTotal: await m(line.salesTotal),
    stockSalesTotal: await m(line.stockSalesTotal),
    gains: await m(line.gains),
    losses: await m(line.losses),
    result: await m(line.result),
    exemptGain: await m(line.exemptGain),
    lossCarriedIn: await m(line.lossCarriedIn),
    lossUsed: await m(line.lossUsed),
    lossCarriedOut: await m(line.lossCarriedOut),
    taxableBase: await m(line.taxableBase),
    ratePercent: pct(line.rate.mul(100)),
    taxBeforeCredit: await m(line.taxBeforeCredit),
    irrfCredit: await m(line.irrfCredit),
    taxDue: await m(line.taxDue),
    belowMinimum: line.belowMinimum,
    darfCode: line.darfCode,
    dueDate: line.dueDate,
    paid: paid !== null,
    paidAmount: paid ? await m(d(paid.amount)) : null,
  };
}

export async function markDarfPaid(
  context: HouseholdContext,
  body: { accountId: string; month: string; bucket: Bucket; amount: string; paidDate: string },
) {
  const year = Number(body.month.slice(0, 4));
  await repo.insertDarfPayment({
    householdId: context.householdId,
    accountId: body.accountId,
    month: body.month,
    bucket: body.bucket,
    amount: body.amount,
    paidDate: body.paidDate,
  } as never);
  const report = await taxes(context, { year, accountId: body.accountId });
  const line = report.apuracao.find((l) => l.month === body.month && l.bucket === body.bucket);
  if (!line) throw new NotFoundError("Tax line");
  return line;
}

// ---------------------------------------------------------------- allocation

function dimensionKey(dimension: string, row: HoldingRow): string {
  switch (dimension) {
    case "class":
      return row.asset.assetClass;
    case "sector":
      return row.asset.sector ?? "Unclassified";
    case "industry":
      return row.asset.industry ?? "Unclassified";
    case "country":
      return row.asset.country ?? "Unknown";
    case "currency":
      return row.asset.currencyId;
    case "account":
      return row.accountIds[0] ?? "unknown";
    case "asset":
      return row.asset.symbol;
    default:
      return row.asset.assetClass;
  }
}

export async function allocation(
  context: HouseholdContext,
  query: ScopeQuery & { dimension: string; net?: boolean },
): Promise<AllocationReport> {
  const scope = await resolveScope(context, query);
  const holdings = await computeHoldings(scope);
  const val = (r: HoldingRow) => (query.net ? r.netValue : r.marketValue);
  const slices = allocate(
    holdings.rows.map((row) => ({ key: dimensionKey(query.dimension, row), value: val(row) })),
  );
  const total = slices.reduce((t, s) => t.plus(s.value), ZERO);
  const targets = query.portfolioId
    ? await repo.listTargets(context, query.portfolioId, query.dimension)
    : [];
  const keys = new Set([...slices.map((s) => s.key), ...targets.map((t) => t.key)]);
  return {
    reportingCurrencyCode: scope.reportingCurrency,
    dimension: query.dimension as never,
    total: await money(scope, total),
    slices: await Promise.all(
      slices.map(async (s) => ({
        key: s.key,
        label: s.key,
        value: await money(scope, s.value),
        percent: pct(s.percent),
      })),
    ),
    targets: await Promise.all(
      [...keys].map(async (key) => {
        const slice = slices.find((s) => s.key === key);
        const target = d(targets.find((t) => t.key === key)?.targetPercent ?? "0");
        return {
          key,
          label: key,
          value: await money(scope, slice?.value ?? ZERO),
          currentPercent: pct(slice?.percent ?? ZERO),
          targetPercent: pct(target),
          drift: pct((slice?.percent ?? ZERO).minus(target)),
        };
      }),
    ),
  };
}

export async function setTargets(
  context: HouseholdContext,
  portfolioId: string,
  body: { dimension: string; targets: { key: string; percent: string }[] },
) {
  if (!(await repo.portfoliosRepository.get(portfolioId, context)))
    throw new NotFoundError("Portfolio");
  await repo.replaceTargets(context, portfolioId, body.dimension, body.targets);
  return { saved: body.targets.length };
}

export async function rebalance(
  context: HouseholdContext,
  query: { portfolioId: string; dimension: string; contribution: string },
): Promise<RebalanceReport> {
  const scope = await resolveScope(context, { portfolioId: query.portfolioId });
  const holdings = await computeHoldings(scope);
  const current = allocate(
    holdings.rows.map((row) => ({
      key: dimensionKey(query.dimension, row),
      value: row.marketValue,
    })),
  );
  const targets = (await repo.listTargets(context, query.portfolioId, query.dimension)).map(
    (t) => ({ key: t.key, percent: d(t.targetPercent) }),
  );
  const contribution = d(query.contribution);
  const result = rebalanceWithContribution(current, targets, contribution);
  return {
    reportingCurrencyCode: scope.reportingCurrency,
    contribution: await money(scope, contribution),
    rows: await Promise.all(
      result.map(async (r) => ({
        key: r.key,
        label: r.key,
        value: await money(scope, r.value),
        currentPercent: pct(r.currentPercent),
        targetPercent: pct(r.targetPercent),
        drift: pct(r.drift),
        buy: await money(scope, r.buy),
      })),
    ),
  };
}

// ---------------------------------------------------------------- holdings at a date

export async function holdingsAt(
  context: HouseholdContext,
  query: { date: string; accountId?: string },
) {
  const scope = await resolveScope(context, { accountId: query.accountId });
  const holdings = await computeHoldings(scope);
  const rows = [];
  for (const { account, events } of holdings.ledgers) {
    const result = runAccountLedger(
      account,
      events.filter((e) => e.tradeDate <= query.date),
    );
    for (const position of result.positions.values()) {
      if (position.quantity.isZero()) continue;
      const asset = holdings.assets.get(position.assetId);
      if (!asset) continue;
      rows.push({
        symbol: asset.symbol,
        name: asset.name,
        assetClass: asset.assetClass as never,
        quantity: position.quantity.toFixed(),
        averageCost: position.avgCostAsset.toDecimalPlaces(8).toFixed(),
        cost: await scope.fx.minor(position.costAsset, asset.currencyId),
        currencyCode: asset.currencyId,
      });
    }
  }
  return { date: query.date, rows };
}

export { isFixedIncomeClass, loadIndexData };
