import { describe, expect, it } from "vitest";
import { allocate, rebalanceWithContribution } from "../investments/allocation.js";
import { BusinessCalendar } from "../investments/calendar.js";
import { Dec, d } from "../investments/decimal.js";
import { timeWeightedReturn, xirr } from "../investments/performance.js";
import {
  brDividendWithholding,
  calculateApuracao,
  fixedIncomeRedemptionTax,
  jcpWithholding,
  type TaxSale,
  usDividendWithholding,
} from "../investments/tax.js";
import { TaxRules } from "../investments/tax-rules.js";
import { DEFAULT_TAX_RULES } from "../investments/tax-seed.js";

const rules = new TaxRules(DEFAULT_TAX_RULES);
const calendar = BusinessCalendar.anbima(2023, 2026);
const redeem = (days: number, assetClass = "CDB") =>
  fixedIncomeRedemptionTax({
    principal: d(10000),
    grossValue: d(11000),
    daysHeld: days,
    assetClass,
    date: "2024-06-01",
    rules,
  });

describe("fixed-income IR and IOF", () => {
  it.each([
    [180, "225"],
    [181, "200"],
    [360, "200"],
    [361, "175"],
    [720, "175"],
    [721, "150"],
  ])("IR at %i days on a gain of 1000 is %s", (days, ir) => {
    expect(redeem(days).ir.toString()).toBe(ir);
  });

  it("IOF is 96% on day 1, 50% on day 15 and zero on day 30", () => {
    const day1 = redeem(1);
    expect(day1.iof.toString()).toBe("960");
    expect(day1.ir.toString()).toBe("9"); // (1000 - 960) * 22.5%
    expect(redeem(15).iof.toString()).toBe("500");
    expect(redeem(30).iof.toString()).toBe("0");
    expect(redeem(30).net.toString()).toBe(String(11000 - 225));
  });

  it("LCI/LCA are exempt for individuals", () => {
    const result = redeem(100, "LCI");
    expect(result.exempt).toBe(true);
    expect(result.net.toString()).toBe("11000");
  });
});

describe("income withholding", () => {
  it("JCP is 15% IRRF", () => {
    const { irrf, net } = jcpWithholding(d(1000), "2024-05-01", rules);
    expect(irrf.toString()).toBe("150");
    expect(net.toString()).toBe("850");
  });
  it("US non-resident dividends are withheld 30%", () => {
    expect(
      usDividendWithholding(d(100), "US_NONRESIDENT", "2024-05-01", rules).withheld.toString(),
    ).toBe("30");
    expect(
      usDividendWithholding(d(100), "US_RESIDENT", "2024-05-01", rules).withheld.toString(),
    ).toBe("0");
  });
  it("BR dividends: withholding only from 2026 and above R$50,000/month", () => {
    expect(brDividendWithholding(d(60000), d(60000), "2025-12-01", rules).withheld.toString()).toBe(
      "0",
    );
    expect(brDividendWithholding(d(60000), d(60000), "2026-02-01", rules).withheld.toString()).toBe(
      "6000",
    );
    expect(brDividendWithholding(d(40000), d(40000), "2026-02-01", rules).withheld.toString()).toBe(
      "0",
    );
  });
});

const sale = (
  date: string,
  assetClass: string,
  gross: string,
  pnl: string,
  category: TaxSale["category"] = "SWING",
  irrf = "0",
): TaxSale => ({
  eventId: `${date}-${assetClass}-${gross}`,
  assetId: assetClass,
  assetClass,
  date,
  category,
  grossBase: d(gross),
  pnlBase: d(pnl),
  irrfBase: d(irrf),
});

describe("BR apuração", () => {
  it("exempts stock gains when monthly sales are at most R$20,000.00", () => {
    const [line] = calculateApuracao(
      [sale("2024-03-10", "STOCK", "20000.00", "1000")],
      rules,
      calendar,
    );
    expect(line?.exemptGain.toString()).toBe("1000");
    expect(line?.taxDue.toString()).toBe("0");
  });

  it("taxes 15% when sales reach R$20,000.01", () => {
    const [line] = calculateApuracao(
      [sale("2024-03-10", "STOCK", "20000.01", "1000")],
      rules,
      calendar,
    );
    expect(line?.taxDue.toString()).toBe("150");
    expect(line?.dueDate).toBe("2024-04-30");
    expect(line?.darfCode).toBe("6015");
  });

  it("carries losses forward across months, per bucket", () => {
    const lines = calculateApuracao(
      [
        sale("2024-01-10", "STOCK", "30000", "-2000"),
        sale("2024-01-12", "FII", "10000", "-500"),
        sale("2024-02-10", "STOCK", "30000", "5000"),
        sale("2024-02-12", "FII", "10000", "1000"),
      ],
      rules,
      calendar,
    );
    const feb = (bucket: string) => lines.find((l) => l.month === "2024-02" && l.bucket === bucket);
    expect(feb("COMMON_SWING")?.lossUsed.toString()).toBe("2000");
    expect(feb("COMMON_SWING")?.taxableBase.toString()).toBe("3000");
    expect(feb("COMMON_SWING")?.taxDue.toString()).toBe("450");
    // FII loss only offsets FII gains, at 20%.
    expect(feb("FII_SWING")?.taxableBase.toString()).toBe("500");
    expect(feb("FII_SWING")?.taxDue.toString()).toBe("100");
  });

  it("ETFs get no exemption and day trade is 20% with IRRF credit", () => {
    const lines = calculateApuracao(
      [
        sale("2024-03-10", "ETF", "5000", "1000"),
        sale("2024-03-11", "STOCK", "1000", "300", "DAY_TRADE", "3"),
      ],
      rules,
      calendar,
    );
    expect(lines.find((l) => l.bucket === "COMMON_SWING")?.taxDue.toString()).toBe("150");
    const dt = lines.find((l) => l.bucket === "DAY_TRADE");
    expect(dt?.taxBeforeCredit.toString()).toBe("60");
    expect(dt?.taxDue.toString()).toBe("57");
  });
});

describe("performance", () => {
  it("XIRR of 10% over exactly one year", () => {
    const rate = xirr([
      { date: "2023-01-01", amount: d(-1000) },
      { date: "2024-01-01", amount: d(1100) },
    ]);
    expect(rate?.toNumber()).toBeCloseTo(0.1, 8);
  });

  it("TWR removes the effect of contributions", () => {
    const { total } = timeWeightedReturn([
      { date: "2024-01-01", value: d(100), flow: new Dec(0) },
      { date: "2024-01-02", value: d(110), flow: new Dec(0) },
      { date: "2024-01-03", value: d(220), flow: d(100) },
    ]);
    expect(total.toNumber()).toBeCloseTo(0.2, 10);
  });
});

describe("allocation", () => {
  it("groups into percentages", () => {
    const slices = allocate([
      { key: "STOCK", value: d(300) },
      { key: "FII", value: d(100) },
      { key: "STOCK", value: d(100) },
    ]);
    expect(slices[0]?.key).toBe("STOCK");
    expect(slices[0]?.percent.toString()).toBe("80");
  });

  it("splits a contribution toward the targets", () => {
    const rows = rebalanceWithContribution(
      [
        { key: "A", value: d(700) },
        { key: "B", value: d(300) },
      ],
      [
        { key: "A", percent: d(50) },
        { key: "B", percent: d(50) },
      ],
      d(400),
    );
    // New total 1400 => 700 each: A needs 0, B needs 400.
    expect(rows.find((r) => r.key === "A")?.buy.toString()).toBe("0");
    expect(rows.find((r) => r.key === "B")?.buy.toString()).toBe("400");
    expect(rows.find((r) => r.key === "A")?.drift.toString()).toBe("20");
  });
});
