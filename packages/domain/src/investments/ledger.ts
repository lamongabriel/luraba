import { Dec, d, ONE, ZERO } from "./decimal.js";
import type { CostBasisMethod, InvestmentEventType, IsoDate, LedgerEvent } from "./types.js";

/**
 * Deterministic position engine. Positions, average price, lots, realized P&L, income and cash are
 * always recomputed from the event ledger; nothing here is stored state.
 *
 * Conventions (documented in docs/investments/DECISIONS.md):
 * - Purchase fees are part of the cost; sale fees reduce proceeds (Receita preço médio rule).
 * - Selling never changes the average price; it only realizes P&L. The average resets when the
 *   quantity reaches zero.
 * - Splits/reverse splits change quantity and per-share cost inversely; no P&L, total cost unchanged.
 * - Cost is tracked in the asset currency and in the account base currency (`fxRateToBase` captured
 *   on each event) so a foreign asset's cost and proceeds convert at their own dates.
 */

export type Lot = {
  id: string;
  assetId: string;
  acquiredDate: IsoDate;
  quantity: Dec;
  costAsset: Dec;
  costBase: Dec;
  /** Average-cost pool: purchases merged into one lot (never set for fixed income, whose lots keep their dates). */
  pooled?: boolean;
};

export type SaleMatch = {
  lotId: string;
  acquiredDate: IsoDate;
  quantity: Dec;
  costAsset: Dec;
  costBase: Dec;
};

export type RealizedSale = {
  eventId: string;
  assetId: string;
  date: IsoDate;
  quantity: Dec;
  currency: string;
  /** Gross sale value before fees. */
  grossAsset: Dec;
  grossBase: Dec;
  /** Proceeds after fees (before tax withheld at source). */
  proceedsAsset: Dec;
  proceedsBase: Dec;
  costAsset: Dec;
  costBase: Dec;
  pnlAsset: Dec;
  pnlBase: Dec;
  taxesWithheldAsset: Dec;
  taxesWithheldBase: Dec;
  category: "SWING" | "DAY_TRADE";
  matches: SaleMatch[];
};

export type IncomeRecord = {
  eventId: string;
  assetId: string | null;
  date: IsoDate;
  type: InvestmentEventType;
  currency: string;
  gross: Dec;
  withheld: Dec;
  net: Dec;
  grossBase: Dec;
  withheldBase: Dec;
  netBase: Dec;
};

export type PositionState = {
  assetId: string;
  currency: string;
  quantity: Dec;
  costAsset: Dec;
  costBase: Dec;
  avgCostAsset: Dec;
  avgCostBase: Dec;
  realizedAsset: Dec;
  realizedBase: Dec;
  incomeGrossAsset: Dec;
  incomeWithheldAsset: Dec;
  incomeNetAsset: Dec;
  feesPaidAsset: Dec;
  lots: Lot[];
};

export type LedgerIssue = {
  eventId: string;
  code: "OVERSELL" | "NEGATIVE_CASH" | "UNKNOWN_ASSET" | "INVALID_EVENT";
  message: string;
};

export type LedgerSnapshot = {
  /** State at the end of this day (events dated on or before it). */
  date: IsoDate;
  positions: {
    assetId: string;
    currency: string;
    quantity: Dec;
    costAsset: Dec;
    costBase: Dec;
    lots: Lot[];
  }[];
  cash: Record<string, Dec>;
};

export type LedgerResult = {
  snapshots: LedgerSnapshot[];
  positions: Map<string, PositionState>;
  sales: RealizedSale[];
  income: IncomeRecord[];
  cash: Record<string, Dec>;
  issues: LedgerIssue[];
};

export type LedgerOptions = {
  method?: CostBasisMethod;
  /** Detect same-day buy+sell of the same asset as day trade (Brazil). */
  detectDayTrade?: boolean;
  /** Throw on the first overselling event instead of clamping and reporting it. */
  strict?: boolean;
  /** Dates (ascending) at which to capture a state snapshot during the single pass. */
  checkpoints?: readonly IsoDate[];
};

export class OversellError extends Error {
  constructor(
    readonly eventId: string,
    readonly assetId: string,
    readonly requested: string,
    readonly available: string,
  ) {
    super(`Cannot sell ${requested} of ${assetId}: only ${available} held`);
    this.name = "OversellError";
  }
}

const PHASE: Record<InvestmentEventType, number> = {
  SPLIT: 0,
  REVERSE_SPLIT: 0,
  BONUS_SHARES: 0,
  SUBSCRIPTION_RIGHT_RECEIVED: 0,
  SPIN_OFF: 0,
  MERGER: 0,
  TICKER_CHANGE: 0,
  DEPOSIT: 1,
  TRANSFER_IN: 1,
  INTEREST_ON_CASH: 1,
  FX_CONVERSION: 1,
  BUY: 2,
  SUBSCRIPTION: 2,
  FI_APPLICATION: 2,
  DIVIDEND: 3,
  JCP: 3,
  FII_INCOME: 3,
  COUPON: 3,
  BOND_INTEREST: 3,
  AMORTIZATION: 3,
  RETURN_OF_CAPITAL: 3,
  SELL: 4,
  FI_REDEMPTION: 4,
  FI_MATURITY: 4,
  DELISTING: 5,
  WITHDRAWAL: 6,
  TRANSFER_OUT: 6,
  FEE: 6,
  TAX_PAYMENT: 6,
};

const ACQUISITIONS = new Set<InvestmentEventType>(["BUY", "SUBSCRIPTION", "FI_APPLICATION"]);
const DISPOSALS = new Set<InvestmentEventType>([
  "SELL",
  "FI_REDEMPTION",
  "FI_MATURITY",
  "DELISTING",
]);
const INCOMES = new Set<InvestmentEventType>([
  "DIVIDEND",
  "JCP",
  "FII_INCOME",
  "COUPON",
  "BOND_INTEREST",
]);

export function sortLedgerEvents(events: readonly LedgerEvent[]): LedgerEvent[] {
  return events
    .map((event, index) => ({ event, index }))
    .sort(
      (a, b) =>
        a.event.tradeDate.localeCompare(b.event.tradeDate) ||
        PHASE[a.event.type] - PHASE[b.event.type] ||
        a.index - b.index,
    )
    .map(({ event }) => event);
}

function fxOf(event: LedgerEvent): Dec {
  return event.fxRateToBase ? d(event.fxRateToBase) : ONE;
}

/** Cash effect of an acquisition: gross plus fees unless `netAmount` is given. */
export function acquisitionCost(event: LedgerEvent): Dec {
  return event.netAmount ? d(event.netAmount) : d(event.grossAmount).plus(d(event.fees));
}

/** Cash proceeds of a disposal: gross minus fees and tax withheld unless `netAmount` is given. */
export function disposalNet(event: LedgerEvent): Dec {
  return event.netAmount
    ? d(event.netAmount)
    : d(event.grossAmount).minus(d(event.fees)).minus(d(event.taxesWithheld));
}

export function incomeNet(event: LedgerEvent): Dec {
  return event.netAmount ? d(event.netAmount) : d(event.grossAmount).minus(d(event.taxesWithheld));
}

function cashAmount(event: LedgerEvent): Dec {
  return event.netAmount ? d(event.netAmount) : d(event.grossAmount);
}

function emptyPosition(assetId: string, currency: string): PositionState {
  return {
    assetId,
    currency,
    quantity: ZERO,
    costAsset: ZERO,
    costBase: ZERO,
    avgCostAsset: ZERO,
    avgCostBase: ZERO,
    realizedAsset: ZERO,
    realizedBase: ZERO,
    incomeGrossAsset: ZERO,
    incomeWithheldAsset: ZERO,
    incomeNetAsset: ZERO,
    feesPaidAsset: ZERO,
    lots: [],
  };
}

function refresh(position: PositionState): void {
  position.quantity = position.lots.reduce((total, lot) => total.plus(lot.quantity), ZERO);
  position.costAsset = position.lots.reduce((total, lot) => total.plus(lot.costAsset), ZERO);
  position.costBase = position.lots.reduce((total, lot) => total.plus(lot.costBase), ZERO);
  if (position.quantity.isZero()) {
    position.lots = [];
    position.costAsset = ZERO;
    position.costBase = ZERO;
    position.avgCostAsset = ZERO;
    position.avgCostBase = ZERO;
    return;
  }
  position.avgCostAsset = position.costAsset.div(position.quantity);
  position.avgCostBase = position.costBase.div(position.quantity);
}

type Engine = {
  options: Required<Pick<LedgerOptions, "method" | "strict">>;
  positions: Map<string, PositionState>;
  sales: RealizedSale[];
  income: IncomeRecord[];
  cash: Record<string, Dec>;
  issues: LedgerIssue[];
};

function addCash(engine: Engine, currency: string, amount: Dec): void {
  engine.cash[currency] = (engine.cash[currency] ?? ZERO).plus(amount);
}

function getPosition(engine: Engine, assetId: string, currency: string): PositionState {
  let position = engine.positions.get(assetId);
  if (!position) {
    position = emptyPosition(assetId, currency);
    engine.positions.set(assetId, position);
  }
  return position;
}

type Acquisition = {
  eventId: string;
  assetId: string;
  date: IsoDate;
  currency: string;
  quantity: Dec;
  costAsset: Dec;
  fee: Dec;
  fx: Dec;
  /** Merge into the position's average-cost pool (average method only). */
  pool?: boolean;
};

function applyAcquisition(engine: Engine, acquisition: Acquisition): void {
  if (acquisition.quantity.lte(0)) {
    return;
  }
  const position = getPosition(engine, acquisition.assetId, acquisition.currency);
  const pool =
    acquisition.pool && engine.options.method !== "FIFO" && engine.options.method !== "SPECIFIC_LOT"
      ? position.lots.find((lot) => lot.pooled)
      : undefined;
  if (pool) {
    // One pooled lot keeps average-cost sales O(1) per asset however many purchases there were.
    pool.quantity = pool.quantity.plus(acquisition.quantity);
    pool.costAsset = pool.costAsset.plus(acquisition.costAsset);
    pool.costBase = pool.costBase.plus(acquisition.costAsset.mul(acquisition.fx));
    if (acquisition.date < pool.acquiredDate) pool.acquiredDate = acquisition.date;
    position.feesPaidAsset = position.feesPaidAsset.plus(acquisition.fee);
    refresh(position);
    return;
  }
  position.lots.push({
    ...(acquisition.pool ? { pooled: true } : {}),
    id: acquisition.eventId,
    assetId: acquisition.assetId,
    acquiredDate: acquisition.date,
    quantity: acquisition.quantity,
    costAsset: acquisition.costAsset,
    costBase: acquisition.costAsset.mul(acquisition.fx),
  });
  position.feesPaidAsset = position.feesPaidAsset.plus(acquisition.fee);
  refresh(position);
}

type Disposal = {
  eventId: string;
  assetId: string;
  date: IsoDate;
  currency: string;
  quantity: Dec;
  grossAsset: Dec;
  feeAsset: Dec;
  taxesAsset: Dec;
  fx: Dec;
  lotPicks?: { lotId: string; quantity: string }[];
};

function takeFromLots(
  position: PositionState,
  quantity: Dec,
  method: CostBasisMethod,
  lotPicks?: Disposal["lotPicks"],
): SaleMatch[] {
  const matches: SaleMatch[] = [];
  const consume = (lot: Lot, take: Dec): void => {
    const ratio = take.div(lot.quantity);
    const costAsset = lot.costAsset.mul(ratio);
    const costBase = lot.costBase.mul(ratio);
    matches.push({
      lotId: lot.id,
      acquiredDate: lot.acquiredDate,
      quantity: take,
      costAsset,
      costBase,
    });
    lot.quantity = lot.quantity.minus(take);
    lot.costAsset = lot.costAsset.minus(costAsset);
    lot.costBase = lot.costBase.minus(costBase);
  };

  if (method === "AVERAGE") {
    const total = position.lots.reduce((acc, lot) => acc.plus(lot.quantity), ZERO);
    const share = quantity.div(total);
    for (const lot of position.lots) {
      if (lot.quantity.gt(0)) {
        consume(lot, lot.quantity.mul(share));
      }
    }
  } else {
    let remaining = quantity;
    if (method === "SPECIFIC_LOT" && lotPicks?.length) {
      for (const pick of lotPicks) {
        const lot = position.lots.find((candidate) => candidate.id === pick.lotId);
        if (!lot) continue;
        const take = Dec.min(lot.quantity, d(pick.quantity), remaining);
        if (take.gt(0)) {
          consume(lot, take);
          remaining = remaining.minus(take);
        }
      }
    }
    const ordered = [...position.lots].sort((a, b) => a.acquiredDate.localeCompare(b.acquiredDate));
    for (const lot of ordered) {
      if (remaining.lte(0)) break;
      const take = Dec.min(lot.quantity, remaining);
      if (take.gt(0)) {
        consume(lot, take);
        remaining = remaining.minus(take);
      }
    }
  }
  position.lots = position.lots.filter((lot) => lot.quantity.gt(0));
  return matches;
}

function applyDisposal(
  engine: Engine,
  disposal: Disposal,
  category: RealizedSale["category"] = "SWING",
): void {
  const position = engine.positions.get(disposal.assetId);
  const held = position?.quantity ?? ZERO;
  let quantity = disposal.quantity;
  if (!position || quantity.gt(held)) {
    if (engine.options.strict) {
      throw new OversellError(
        disposal.eventId,
        disposal.assetId,
        quantity.toFixed(),
        held.toFixed(),
      );
    }
    engine.issues.push({
      eventId: disposal.eventId,
      code: "OVERSELL",
      message: `Sells ${quantity.toFixed()} but only ${held.toFixed()} held`,
    });
    if (!position || held.isZero()) {
      return;
    }
    quantity = held;
  }
  if (quantity.lte(0)) {
    return;
  }

  const scale = quantity.div(disposal.quantity);
  const grossAsset = disposal.grossAsset.mul(scale);
  const feeAsset = disposal.feeAsset.mul(scale);
  const taxesAsset = disposal.taxesAsset.mul(scale);
  const matches = takeFromLots(position, quantity, engine.options.method, disposal.lotPicks);
  refresh(position);

  const costAsset = matches.reduce((total, match) => total.plus(match.costAsset), ZERO);
  const costBase = matches.reduce((total, match) => total.plus(match.costBase), ZERO);
  const proceedsAsset = grossAsset.minus(feeAsset);
  const proceedsBase = proceedsAsset.mul(disposal.fx);
  const pnlAsset = proceedsAsset.minus(costAsset);
  const pnlBase = proceedsBase.minus(costBase);

  position.realizedAsset = position.realizedAsset.plus(pnlAsset);
  position.realizedBase = position.realizedBase.plus(pnlBase);
  position.feesPaidAsset = position.feesPaidAsset.plus(feeAsset);

  engine.sales.push({
    eventId: disposal.eventId,
    assetId: disposal.assetId,
    date: disposal.date,
    quantity,
    currency: disposal.currency,
    grossAsset,
    grossBase: grossAsset.mul(disposal.fx),
    proceedsAsset,
    proceedsBase,
    costAsset,
    costBase,
    pnlAsset,
    pnlBase,
    taxesWithheldAsset: taxesAsset,
    taxesWithheldBase: taxesAsset.mul(disposal.fx),
    category,
    matches,
  });
}

/** Day-trade pre-pass for one asset on one date: returns the events with day-traded quantity removed. */
function splitDayTrade(
  engine: Engine,
  buys: LedgerEvent[],
  sells: LedgerEvent[],
): { buys: Acquisition[]; sells: Disposal[] } {
  const toAcquisition = (event: LedgerEvent): Acquisition => ({
    eventId: event.id,
    assetId: event.assetId as string,
    date: event.tradeDate,
    currency: event.currency,
    quantity: d(event.quantity),
    costAsset: acquisitionCost(event),
    fee: d(event.fees),
    fx: fxOf(event),
  });
  const toDisposal = (event: LedgerEvent): Disposal => ({
    eventId: event.id,
    assetId: event.assetId as string,
    date: event.tradeDate,
    currency: event.currency,
    quantity: d(event.quantity),
    grossAsset: d(event.grossAmount),
    feeAsset: d(event.fees),
    taxesAsset: d(event.taxesWithheld),
    fx: fxOf(event),
    lotPicks: event.meta?.lots,
  });

  const acquisitions = buys.map(toAcquisition);
  const disposals = sells.map(toDisposal);
  const boughtQty = acquisitions.reduce((total, item) => total.plus(item.quantity), ZERO);
  const soldQty = disposals.reduce((total, item) => total.plus(item.quantity), ZERO);
  const dayQty = Dec.min(boughtQty, soldQty);
  if (dayQty.lte(0)) {
    return { buys: acquisitions, sells: disposals };
  }

  const buyCost = acquisitions.reduce((total, item) => total.plus(item.costAsset), ZERO);
  const buyCostBase = acquisitions.reduce(
    (total, item) => total.plus(item.costAsset.mul(item.fx)),
    ZERO,
  );
  const sellGross = disposals.reduce((total, item) => total.plus(item.grossAsset), ZERO);
  const sellFees = disposals.reduce((total, item) => total.plus(item.feeAsset), ZERO);
  const sellTaxes = disposals.reduce((total, item) => total.plus(item.taxesAsset), ZERO);
  const sellGrossBase = disposals.reduce(
    (total, item) => total.plus(item.grossAsset.mul(item.fx)),
    ZERO,
  );
  const sellFeesBase = disposals.reduce(
    (total, item) => total.plus(item.feeAsset.mul(item.fx)),
    ZERO,
  );
  const sellTaxesBase = disposals.reduce(
    (total, item) => total.plus(item.taxesAsset.mul(item.fx)),
    ZERO,
  );

  const first = disposals[0] as Disposal;
  const dtCostAsset = buyCost.mul(dayQty).div(boughtQty);
  const dtCostBase = buyCostBase.mul(dayQty).div(boughtQty);
  const dtGross = sellGross.mul(dayQty).div(soldQty);
  const dtFees = sellFees.mul(dayQty).div(soldQty);
  const dtGrossBase = sellGrossBase.mul(dayQty).div(soldQty);
  const dtFeesBase = sellFeesBase.mul(dayQty).div(soldQty);
  const dtProceedsAsset = dtGross.minus(dtFees);
  const dtProceedsBase = dtGrossBase.minus(dtFeesBase);
  const position = getPosition(engine, first.assetId, first.currency);
  const pnlAsset = dtProceedsAsset.minus(dtCostAsset);
  const pnlBase = dtProceedsBase.minus(dtCostBase);
  position.realizedAsset = position.realizedAsset.plus(pnlAsset);
  position.realizedBase = position.realizedBase.plus(pnlBase);
  position.feesPaidAsset = position.feesPaidAsset.plus(dtFees);
  engine.sales.push({
    eventId: first.eventId,
    assetId: first.assetId,
    date: first.date,
    quantity: dayQty,
    currency: first.currency,
    grossAsset: dtGross,
    grossBase: dtGrossBase,
    proceedsAsset: dtProceedsAsset,
    proceedsBase: dtProceedsBase,
    costAsset: dtCostAsset,
    costBase: dtCostBase,
    pnlAsset,
    pnlBase,
    taxesWithheldAsset: sellTaxes.mul(dayQty).div(soldQty),
    taxesWithheldBase: sellTaxesBase.mul(dayQty).div(soldQty),
    category: "DAY_TRADE",
    matches: [],
  });

  const buyKeep = boughtQty.minus(dayQty).div(boughtQty);
  const sellKeep = soldQty.minus(dayQty).div(soldQty);
  return {
    buys: acquisitions.map((item) => ({
      ...item,
      quantity: item.quantity.mul(buyKeep),
      costAsset: item.costAsset.mul(buyKeep),
      fee: item.fee.mul(buyKeep),
    })),
    sells: disposals.map((item) => ({
      ...item,
      quantity: item.quantity.mul(sellKeep),
      grossAsset: item.grossAsset.mul(sellKeep),
      feeAsset: item.feeAsset.mul(sellKeep),
      taxesAsset: item.taxesAsset.mul(sellKeep),
    })),
  };
}

function applyCash(engine: Engine, event: LedgerEvent): void {
  const { type, currency } = event;
  if (event.meta?.skipCash) {
    return;
  }
  if (ACQUISITIONS.has(type)) {
    addCash(engine, currency, acquisitionCost(event).neg());
  } else if (DISPOSALS.has(type)) {
    addCash(engine, currency, disposalNet(event));
  } else if (INCOMES.has(type) || type === "AMORTIZATION" || type === "RETURN_OF_CAPITAL") {
    addCash(engine, currency, incomeNet(event));
  } else if (type === "DEPOSIT" || type === "TRANSFER_IN" || type === "INTEREST_ON_CASH") {
    addCash(engine, currency, cashAmount(event));
  } else if (
    type === "WITHDRAWAL" ||
    type === "TRANSFER_OUT" ||
    type === "FEE" ||
    type === "TAX_PAYMENT"
  ) {
    addCash(engine, currency, cashAmount(event).neg());
  } else if (type === "FX_CONVERSION") {
    addCash(engine, currency, cashAmount(event).neg());
    if (event.meta?.toCurrency) {
      addCash(engine, event.meta.toCurrency, d(event.meta.toAmount));
    }
  }
}

function applyCorporateAction(engine: Engine, event: LedgerEvent): void {
  const assetId = event.assetId;
  if (!assetId) {
    engine.issues.push({
      eventId: event.id,
      code: "UNKNOWN_ASSET",
      message: "Event needs an asset",
    });
    return;
  }
  const fx = fxOf(event);
  const position = engine.positions.get(assetId);
  switch (event.type) {
    case "SPLIT":
    case "REVERSE_SPLIT": {
      if (!position) return;
      const from = d(event.meta?.ratioFrom);
      const to = d(event.meta?.ratioTo);
      if (from.lte(0) || to.lte(0)) {
        engine.issues.push({
          eventId: event.id,
          code: "INVALID_EVENT",
          message: "Split needs a positive ratio",
        });
        return;
      }
      const factor = to.div(from);
      for (const lot of position.lots) {
        lot.quantity = lot.quantity.mul(factor);
      }
      refresh(position);
      return;
    }
    case "BONUS_SHARES":
    case "SUBSCRIPTION_RIGHT_RECEIVED": {
      const cost = event.type === "BONUS_SHARES" ? d(event.grossAmount) : ZERO;
      applyAcquisition(engine, {
        eventId: event.id,
        assetId,
        date: event.tradeDate,
        currency: event.currency,
        quantity: d(event.quantity),
        costAsset: cost,
        fee: ZERO,
        fx,
      });
      return;
    }
    case "SPIN_OFF": {
      const targetId = event.meta?.targetAssetId;
      if (!position || !targetId) return;
      const ratio = d(event.meta?.costRatio);
      let movedAsset = ZERO;
      let movedBase = ZERO;
      for (const lot of position.lots) {
        const a = lot.costAsset.mul(ratio);
        const b = lot.costBase.mul(ratio);
        lot.costAsset = lot.costAsset.minus(a);
        lot.costBase = lot.costBase.minus(b);
        movedAsset = movedAsset.plus(a);
        movedBase = movedBase.plus(b);
      }
      refresh(position);
      const child = getPosition(engine, targetId, event.currency);
      child.lots.push({
        id: event.id,
        assetId: targetId,
        acquiredDate: event.tradeDate,
        quantity: d(event.quantity),
        costAsset: movedAsset,
        costBase: movedBase,
      });
      refresh(child);
      return;
    }
    case "MERGER":
    case "TICKER_CHANGE": {
      const targetId = event.meta?.targetAssetId;
      if (!position || !targetId) return;
      const exchange = event.meta?.exchangeRatio ? d(event.meta.exchangeRatio) : ONE;
      const target = getPosition(engine, targetId, position.currency);
      for (const lot of position.lots) {
        target.lots.push({
          ...lot,
          assetId: targetId,
          quantity: lot.quantity.mul(exchange),
        });
      }
      target.realizedAsset = target.realizedAsset.plus(position.realizedAsset);
      target.realizedBase = target.realizedBase.plus(position.realizedBase);
      target.incomeGrossAsset = target.incomeGrossAsset.plus(position.incomeGrossAsset);
      target.incomeWithheldAsset = target.incomeWithheldAsset.plus(position.incomeWithheldAsset);
      target.incomeNetAsset = target.incomeNetAsset.plus(position.incomeNetAsset);
      target.feesPaidAsset = target.feesPaidAsset.plus(position.feesPaidAsset);
      position.lots = [];
      position.realizedAsset = ZERO;
      position.realizedBase = ZERO;
      position.incomeGrossAsset = ZERO;
      position.incomeWithheldAsset = ZERO;
      position.incomeNetAsset = ZERO;
      position.feesPaidAsset = ZERO;
      refresh(position);
      refresh(target);
      return;
    }
    default:
      return;
  }
}

function applyIncomeOrCapital(engine: Engine, event: LedgerEvent): void {
  const gross = d(event.grossAmount);
  const withheld = d(event.taxesWithheld);
  const net = incomeNet(event);
  const fx = fxOf(event);
  const position = event.assetId ? getPosition(engine, event.assetId, event.currency) : undefined;

  if (event.type === "AMORTIZATION" || event.type === "RETURN_OF_CAPITAL") {
    if (!position) return;
    let remaining = gross;
    const total = position.costAsset;
    if (total.gt(0)) {
      const reduction = Dec.min(total, remaining);
      const ratio = reduction.div(total);
      for (const lot of position.lots) {
        lot.costAsset = lot.costAsset.minus(lot.costAsset.mul(ratio));
        lot.costBase = lot.costBase.minus(lot.costBase.mul(ratio));
      }
      remaining = remaining.minus(reduction);
    }
    refresh(position);
    if (remaining.gt(0)) {
      // Capital returned above cost is a realized gain.
      position.realizedAsset = position.realizedAsset.plus(remaining);
      position.realizedBase = position.realizedBase.plus(remaining.mul(fx));
    }
    return;
  }

  engine.income.push({
    eventId: event.id,
    assetId: event.assetId ?? null,
    date: event.tradeDate,
    type: event.type,
    currency: event.currency,
    gross,
    withheld,
    net,
    grossBase: gross.mul(fx),
    withheldBase: withheld.mul(fx),
    netBase: net.mul(fx),
  });
  if (position) {
    position.incomeGrossAsset = position.incomeGrossAsset.plus(gross);
    position.incomeWithheldAsset = position.incomeWithheldAsset.plus(withheld);
    position.incomeNetAsset = position.incomeNetAsset.plus(net);
  }
}

export function computeLedger(
  rawEvents: readonly LedgerEvent[],
  options: LedgerOptions = {},
): LedgerResult {
  const engine: Engine = {
    options: { method: options.method ?? "AVERAGE", strict: options.strict ?? false },
    positions: new Map(),
    sales: [],
    income: [],
    cash: {},
    issues: [],
  };

  const events = sortLedgerEvents(rawEvents);
  const dayTradeHandled = new Set<string>();
  // Same-day trades per asset, grouped once: filtering all events per trade would be quadratic.
  const dayTrades = new Map<string, LedgerEvent[]>();
  if (options.detectDayTrade) {
    for (const candidate of events) {
      if (candidate.type !== "BUY" && candidate.type !== "SELL") continue;
      const key = `${candidate.tradeDate}|${candidate.assetId}`;
      const group = dayTrades.get(key);
      if (group) group.push(candidate);
      else dayTrades.set(key, [candidate]);
    }
  }
  const checkpoints = options.checkpoints ?? [];
  const snapshots: LedgerSnapshot[] = [];
  let nextCheckpoint = 0;
  const capture = (date: IsoDate): void => {
    snapshots.push({
      date,
      positions: [...engine.positions.values()]
        .filter((position) => position.quantity.gt(0))
        .map((position) => ({
          assetId: position.assetId,
          currency: position.currency,
          quantity: position.quantity,
          costAsset: position.costAsset,
          costBase: position.costBase,
          lots: position.lots.map((lot) => ({ ...lot })),
        })),
      cash: { ...engine.cash },
    });
  };

  for (const event of events) {
    while (
      nextCheckpoint < checkpoints.length &&
      (checkpoints[nextCheckpoint] as string) < event.tradeDate
    ) {
      capture(checkpoints[nextCheckpoint++] as string);
    }
    applyCash(engine, event);
    const { type } = event;

    if (PHASE[type] === 0) {
      applyCorporateAction(engine, event);
      continue;
    }
    if (INCOMES.has(type) || type === "AMORTIZATION" || type === "RETURN_OF_CAPITAL") {
      applyIncomeOrCapital(engine, event);
      continue;
    }

    const isAcquisition = ACQUISITIONS.has(type);
    const isDisposal = DISPOSALS.has(type);
    if (!isAcquisition && !isDisposal) {
      continue;
    }
    if (!event.assetId) {
      engine.issues.push({
        eventId: event.id,
        code: "UNKNOWN_ASSET",
        message: "Trade needs an asset",
      });
      continue;
    }

    if (options.detectDayTrade && (type === "BUY" || type === "SELL")) {
      const key = `${event.tradeDate}|${event.assetId}`;
      if (dayTradeHandled.has(key)) {
        continue;
      }
      dayTradeHandled.add(key);
      const sameDay = dayTrades.get(key) ?? [];
      const result = splitDayTrade(
        engine,
        sameDay.filter((candidate) => candidate.type === "BUY"),
        sameDay.filter((candidate) => candidate.type === "SELL"),
      );
      for (const acquisition of result.buys) applyAcquisition(engine, acquisition);
      for (const disposal of result.sells) applyDisposal(engine, disposal);
      continue;
    }

    if (isAcquisition) {
      applyAcquisition(engine, {
        eventId: event.id,
        assetId: event.assetId,
        date: event.tradeDate,
        currency: event.currency,
        quantity: d(event.quantity),
        costAsset: acquisitionCost(event),
        fee: d(event.fees),
        fx: fxOf(event),
        pool: event.type !== "FI_APPLICATION",
      });
    } else {
      let quantity = d(event.quantity);
      if ((type === "FI_MATURITY" || type === "DELISTING") && quantity.isZero()) {
        quantity = engine.positions.get(event.assetId)?.quantity ?? ZERO;
      }
      applyDisposal(engine, {
        eventId: event.id,
        assetId: event.assetId,
        date: event.tradeDate,
        currency: event.currency,
        quantity,
        grossAsset: d(event.grossAmount),
        feeAsset: d(event.fees),
        taxesAsset: d(event.taxesWithheld),
        fx: fxOf(event),
        lotPicks: event.meta?.lots,
      });
    }
  }

  while (nextCheckpoint < checkpoints.length) {
    capture(checkpoints[nextCheckpoint++] as string);
  }

  for (const [currency, amount] of Object.entries(engine.cash)) {
    if (amount.lt(0)) {
      engine.issues.push({
        eventId: "",
        code: "NEGATIVE_CASH",
        message: `Cash in ${currency} is negative (${amount.toFixed()})`,
      });
    }
  }

  return {
    snapshots,
    positions: engine.positions,
    sales: engine.sales,
    income: engine.income,
    cash: engine.cash,
    issues: engine.issues,
  };
}

/** Validates that appending/editing leaves no overselling; returns the first problem or null. */
export function findOversell(
  events: readonly LedgerEvent[],
  options: LedgerOptions = {},
): LedgerIssue | null {
  const result = computeLedger(events, { ...options, strict: false });
  return result.issues.find((issue) => issue.code === "OVERSELL") ?? null;
}
