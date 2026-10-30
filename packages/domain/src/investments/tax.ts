import { type BusinessCalendar, diffIsoDays } from "./calendar.js";
import { Dec, d, ZERO } from "./decimal.js";
import type { RealizedSale } from "./ledger.js";
import type { TaxRules } from "./tax-rules.js";
import type { IsoDate, TaxProfile } from "./types.js";

const CENTS = 2;
const roundCents = (value: Dec): Dec => value.toDecimalPlaces(CENTS, Dec.ROUND_HALF_UP);

// ---------------------------------------------------------------- fixed income (Brazil)

export type RedemptionTax = {
  gain: Dec;
  daysHeld: number;
  iofRate: Dec;
  iof: Dec;
  irRate: Dec;
  ir: Dec;
  exempt: boolean;
  net: Dec;
};

/**
 * IR and IOF on a Brazilian fixed-income redemption/maturity/coupon. IOF (first 30 days) is
 * charged on the gain and reduces the base of the IR; both are regressive tables read from data.
 */
export function fixedIncomeRedemptionTax(input: {
  principal: Dec;
  grossValue: Dec;
  daysHeld: number;
  assetClass: string;
  date: IsoDate;
  rules: TaxRules;
  /** When false (non-individual / disabled) exemptions do not apply. */
  applyExemptions?: boolean;
}): RedemptionTax {
  const { principal, grossValue, daysHeld, assetClass, date, rules } = input;
  const gain = grossValue.minus(principal);
  const exempt =
    input.applyExemptions !== false && rules.has("BR_FI_IR_EXEMPT", date, { assetClass });
  if (gain.lte(0)) {
    return {
      gain,
      daysHeld,
      iofRate: ZERO,
      iof: ZERO,
      irRate: ZERO,
      ir: ZERO,
      exempt,
      net: grossValue,
    };
  }
  const iofRate = exempt ? ZERO : rules.rate("BR_FI_IOF_DAY", date, { days: daysHeld });
  const iof = exempt || daysHeld > 30 ? ZERO : roundCents(gain.mul(iofRate));
  const irRate = exempt ? ZERO : rules.rate("BR_FI_IR_BRACKET", date, { days: daysHeld });
  const ir = roundCents(gain.minus(iof).mul(irRate));
  return { gain, daysHeld, iofRate, iof, irRate, ir, exempt, net: grossValue.minus(iof).minus(ir) };
}

export function irBracketTimeline(
  assetClass: string,
  date: IsoDate,
  rules: TaxRules,
): { fromDay: number; toDay: number | null; rate: Dec }[] {
  if (rules.has("BR_FI_IR_EXEMPT", date, { assetClass })) {
    return [{ fromDay: 0, toDay: null, rate: ZERO }];
  }
  return rules
    .find("BR_FI_IR_BRACKET", date)
    .map((row) => ({ fromDay: row.minDays ?? 0, toDay: row.maxDays ?? null, rate: d(row.rate) }))
    .sort((a, b) => a.fromDay - b.fromDay);
}

// ---------------------------------------------------------------- income withholding

export function jcpWithholding(
  gross: Dec,
  date: IsoDate,
  rules: TaxRules,
): { irrf: Dec; net: Dec } {
  const irrf = roundCents(gross.mul(rules.rate("BR_JCP_IRRF", date, { eventType: "JCP" })));
  return { irrf, net: gross.minus(irrf) };
}

/** Lei 15.270/2025: withholding on the whole payment once the month's total exceeds the threshold. */
export function brDividendWithholding(
  gross: Dec,
  monthlyTotalFromSameCompany: Dec,
  date: IsoDate,
  rules: TaxRules,
): { withheld: Dec; net: Dec } {
  const rule = rules.first("BR_DIVIDEND_WITHHOLDING", date, { eventType: "DIVIDEND" });
  if (!rule || monthlyTotalFromSameCompany.lte(d(rule.threshold))) {
    return { withheld: ZERO, net: gross };
  }
  const withheld = roundCents(gross.mul(d(rule.rate)));
  return { withheld, net: gross.minus(withheld) };
}

export function usDividendWithholding(
  gross: Dec,
  profile: TaxProfile,
  date: IsoDate,
  rules: TaxRules,
): { withheld: Dec; net: Dec } {
  if (profile !== "US_NONRESIDENT") {
    return { withheld: ZERO, net: gross };
  }
  const withheld = roundCents(
    gross.mul(rules.rate("US_NRA_DIVIDEND_WITHHOLDING", date, { eventType: "DIVIDEND" })),
  );
  return { withheld, net: gross.minus(withheld) };
}

// ---------------------------------------------------------------- Brazil variable income (apuração)

export type Bucket = "COMMON_SWING" | "FII_SWING" | "DAY_TRADE";

export function bucketOf(assetClass: string, category: RealizedSale["category"]): Bucket | null {
  if (category === "DAY_TRADE") return "DAY_TRADE";
  if (
    assetClass === "STOCK" ||
    assetClass === "UNIT" ||
    assetClass === "ETF" ||
    assetClass === "BDR"
  ) {
    return "COMMON_SWING";
  }
  if (assetClass === "FII" || assetClass === "FIAGRO") return "FII_SWING";
  return null;
}

export type TaxSale = {
  eventId: string;
  assetId: string;
  assetClass: string;
  date: IsoDate;
  category: RealizedSale["category"];
  /** Gross sale value and realized result in BRL. */
  grossBase: Dec;
  pnlBase: Dec;
  /** IRRF dedo-duro already withheld, BRL. */
  irrfBase: Dec;
};

export type ApuracaoLine = {
  month: string;
  bucket: Bucket;
  salesTotal: Dec;
  stockSalesTotal: Dec;
  gains: Dec;
  losses: Dec;
  result: Dec;
  exemptGain: Dec;
  lossCarriedIn: Dec;
  lossUsed: Dec;
  lossCarriedOut: Dec;
  taxableBase: Dec;
  rate: Dec;
  taxBeforeCredit: Dec;
  irrfCredit: Dec;
  irrfCreditCarriedIn: Dec;
  taxDue: Dec;
  /** Tax below the DARF minimum is carried into a later month. */
  belowMinimum: boolean;
  darfCode: string;
  dueDate: IsoDate;
};

export function calculateApuracao(
  sales: readonly TaxSale[],
  rules: TaxRules,
  calendar: BusinessCalendar,
): ApuracaoLine[] {
  const months = [...new Set(sales.map((sale) => sale.date.slice(0, 7)))].sort();
  const carry: Record<Bucket, Dec> = { COMMON_SWING: ZERO, FII_SWING: ZERO, DAY_TRADE: ZERO };
  const irrfCarry: Record<Bucket, Dec> = { COMMON_SWING: ZERO, FII_SWING: ZERO, DAY_TRADE: ZERO };
  const unpaidCarry: Record<Bucket, Dec> = { COMMON_SWING: ZERO, FII_SWING: ZERO, DAY_TRADE: ZERO };
  const lines: ApuracaoLine[] = [];

  for (const month of months) {
    const inMonth = sales.filter((sale) => sale.date.startsWith(month));
    const referenceDate = `${month}-28`;
    for (const bucket of ["COMMON_SWING", "FII_SWING", "DAY_TRADE"] as Bucket[]) {
      const bucketSales = inMonth.filter(
        (sale) => bucketOf(sale.assetClass, sale.category) === bucket,
      );
      if (bucketSales.length === 0) continue;

      const salesTotal = bucketSales.reduce((total, sale) => total.plus(sale.grossBase), ZERO);
      const stockSales = bucketSales.filter(
        (sale) => sale.assetClass === "STOCK" || sale.assetClass === "UNIT",
      );
      const stockSalesTotal = stockSales.reduce((total, sale) => total.plus(sale.grossBase), ZERO);
      const gains = bucketSales.reduce(
        (total, sale) => (sale.pnlBase.gt(0) ? total.plus(sale.pnlBase) : total),
        ZERO,
      );
      const losses = bucketSales.reduce(
        (total, sale) => (sale.pnlBase.lt(0) ? total.plus(sale.pnlBase.abs()) : total),
        ZERO,
      );

      // Stock gains are exempt when the month's stock sales stay within the threshold.
      let exemptGain = ZERO;
      let result = bucketSales.reduce((total, sale) => total.plus(sale.pnlBase), ZERO);
      if (bucket === "COMMON_SWING") {
        const limit = rules.threshold("BR_VAR_SALES_EXEMPTION", referenceDate, {
          assetClass: "STOCK",
        });
        if (limit.gt(0) && stockSalesTotal.lte(limit)) {
          const stockResult = stockSales.reduce((total, sale) => total.plus(sale.pnlBase), ZERO);
          if (stockResult.gt(0)) {
            exemptGain = stockResult;
            result = result.minus(stockResult);
          }
        }
      }

      const lossCarriedIn = carry[bucket];
      let lossUsed = ZERO;
      let taxableBase = ZERO;
      let lossCarriedOut = lossCarriedIn;
      if (result.gt(0)) {
        lossUsed = Dec.min(lossCarriedIn, result);
        taxableBase = result.minus(lossUsed);
        lossCarriedOut = lossCarriedIn.minus(lossUsed);
      } else if (result.lt(0)) {
        lossCarriedOut = lossCarriedIn.plus(result.abs());
      }
      carry[bucket] = lossCarriedOut;

      const rate = rules.rate("BR_VAR_RATE", referenceDate, { bucket });
      const taxBeforeCredit = roundCents(taxableBase.mul(rate));
      const irrfThisMonth = bucketSales.reduce((total, sale) => total.plus(sale.irrfBase), ZERO);
      const irrfCreditCarriedIn = irrfCarry[bucket];
      const availableCredit = irrfThisMonth.plus(irrfCreditCarriedIn);
      const credit = Dec.min(availableCredit, taxBeforeCredit);
      irrfCarry[bucket] = availableCredit.minus(credit);

      const payable = taxBeforeCredit.minus(credit).plus(unpaidCarry[bucket]);
      const darf = rules.first("BR_DARF", referenceDate);
      const minimum = d(darf?.threshold);
      const belowMinimum = payable.gt(0) && payable.lt(minimum);
      unpaidCarry[bucket] = belowMinimum ? payable : ZERO;

      const [yearText, monthText] = month.split("-") as [string, string];
      const nextMonth = Number(monthText) === 12 ? 1 : Number(monthText) + 1;
      const nextYear = Number(monthText) === 12 ? Number(yearText) + 1 : Number(yearText);
      lines.push({
        month,
        bucket,
        salesTotal,
        stockSalesTotal,
        gains,
        losses,
        result: bucketSales.reduce((total, sale) => total.plus(sale.pnlBase), ZERO),
        exemptGain,
        lossCarriedIn,
        lossUsed,
        lossCarriedOut,
        taxableBase,
        rate,
        taxBeforeCredit,
        irrfCredit: credit,
        irrfCreditCarriedIn,
        taxDue: belowMinimum ? ZERO : payable,
        belowMinimum,
        darfCode: String(darf?.params?.code ?? "6015"),
        dueDate: calendar.lastBusinessDayOfMonth(nextYear, nextMonth),
      });
    }
  }
  return lines;
}

/** Estimated IRRF dedo-duro on a sale; informational when the broker did not report it. */
export function estimateDedoDuro(sale: TaxSale, rules: TaxRules): Dec {
  const bucket = bucketOf(sale.assetClass, sale.category);
  if (!bucket) return ZERO;
  const rate = rules.rate("BR_IRRF_DEDO_DURO", sale.date, { bucket });
  const base = bucket === "DAY_TRADE" ? Dec.max(sale.pnlBase, ZERO) : sale.grossBase;
  return base.mul(rate).toDecimalPlaces(2, Dec.ROUND_HALF_UP);
}

// ---------------------------------------------------------------- offshore (Brazil resident)

export function offshoreFlatTax(
  annualNetGainBrl: Dec,
  foreignTaxCreditBrl: Dec,
  date: IsoDate,
  rules: TaxRules,
): Dec {
  if (annualNetGainBrl.lte(0)) return ZERO;
  const gross = roundCents(annualNetGainBrl.mul(rules.rate("BR_OFFSHORE_FLAT", date)));
  return Dec.max(gross.minus(foreignTaxCreditBrl), ZERO);
}

// ---------------------------------------------------------------- United States

export type UsLotGain = {
  saleEventId: string;
  assetId: string;
  lotId: string;
  quantity: Dec;
  acquiredDate: IsoDate;
  saleDate: IsoDate;
  proceeds: Dec;
  cost: Dec;
  gain: Dec;
  daysHeld: number;
  term: "SHORT" | "LONG";
  estimatedTax: Dec;
};

/** Per-lot short/long-term split. Non-residents owe no US capital-gains tax (estimate 0). */
export function usRealizedGains(
  sales: readonly RealizedSale[],
  profile: TaxProfile,
  rules: TaxRules,
): UsLotGain[] {
  const rows: UsLotGain[] = [];
  for (const sale of sales) {
    for (const match of sale.matches) {
      const share = sale.quantity.isZero() ? ZERO : match.quantity.div(sale.quantity);
      const proceeds = sale.proceedsAsset.mul(share);
      const gain = proceeds.minus(match.costAsset);
      const daysHeld = diffIsoDays(match.acquiredDate, sale.date);
      const longDays = rules.threshold("US_LONG_TERM_DAYS", sale.date).toNumber() || 365;
      const term = daysHeld > longDays ? "LONG" : "SHORT";
      let estimatedTax = ZERO;
      if (profile === "US_RESIDENT" && gain.gt(0)) {
        const row = rules.find("US_CAPITAL_GAINS", sale.date).find((r) => r.params?.term === term);
        estimatedTax = roundCents(gain.mul(d(row?.rate)));
      }
      rows.push({
        saleEventId: sale.eventId,
        assetId: sale.assetId,
        lotId: match.lotId,
        quantity: match.quantity,
        acquiredDate: match.acquiredDate,
        saleDate: sale.date,
        proceeds,
        cost: match.costAsset,
        gain,
        daysHeld,
        term,
        estimatedTax,
      });
    }
  }
  return rows;
}

export const TAX_DISCLAIMER =
  "Estimated figures for information only. This is not tax advice; rates and rules change, so verify with a qualified professional or the tax authority.";
