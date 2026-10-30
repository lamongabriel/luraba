import { describe, expect, it } from "vitest";
import { computeLedger, OversellError } from "../investments/ledger.js";
import type { LedgerEvent } from "../investments/types.js";

let seq = 0;
function ev(partial: Partial<LedgerEvent> & Pick<LedgerEvent, "type" | "tradeDate">): LedgerEvent {
  seq++;
  return {
    id: `e${seq}`,
    assetId: "PETR4",
    grossAmount: "0",
    currency: "BRL",
    ...partial,
  };
}
const buy = (
  date: string,
  qty: string,
  price: string,
  fees = "0",
  extra: Partial<LedgerEvent> = {},
) =>
  ev({
    type: "BUY",
    tradeDate: date,
    quantity: qty,
    unitPrice: price,
    grossAmount: String(Number(qty) * Number(price)),
    fees,
    ...extra,
  });
const sell = (
  date: string,
  qty: string,
  price: string,
  fees = "0",
  extra: Partial<LedgerEvent> = {},
) =>
  ev({
    type: "SELL",
    tradeDate: date,
    quantity: qty,
    unitPrice: price,
    grossAmount: String(Number(qty) * Number(price)),
    fees,
    ...extra,
  });

const pos = (events: LedgerEvent[], options = {}) =>
  computeLedger(events, options).positions.get("PETR4");

describe("preço médio (AVERAGE)", () => {
  it("includes purchase fees and is unchanged by sales", () => {
    const result = computeLedger([
      buy("2024-01-02", "100", "10", "5"), // cost 1005
      buy("2024-01-03", "100", "12", "5"), // cost 1205 => 2210 / 200 = 11.05
      sell("2024-01-04", "50", "15", "3"), // proceeds 747, cost 552.5
    ]);
    const p = result.positions.get("PETR4");
    expect(p?.quantity.toString()).toBe("150");
    expect(p?.avgCostAsset.toString()).toBe("11.05");
    expect(p?.costAsset.toString()).toBe("1657.5");
    expect(p?.realizedAsset.toString()).toBe("194.5");
  });

  it("restarts the average from zero", () => {
    const p = pos([
      buy("2024-01-02", "10", "10"),
      sell("2024-01-03", "10", "12"),
      buy("2024-01-04", "5", "20"),
    ]);
    expect(p?.avgCostAsset.toString()).toBe("20");
    expect(p?.realizedAsset.toString()).toBe("20");
    expect(p?.quantity.toString()).toBe("5");
  });

  it("adds bonus shares at the announced cost", () => {
    const p = pos([
      buy("2024-01-02", "100", "10"), // 1000
      ev({ type: "BONUS_SHARES", tradeDate: "2024-02-01", quantity: "10", grossAmount: "100" }),
    ]);
    expect(p?.quantity.toString()).toBe("110");
    expect(p?.costAsset.toString()).toBe("1100");
    expect(p?.avgCostAsset.toString()).toBe("10");
  });

  it("splits 1:10 and reverse splits 10:1 without P&L", () => {
    const split = pos([
      buy("2024-01-02", "100", "50"),
      ev({ type: "SPLIT", tradeDate: "2024-02-01", meta: { ratioFrom: "1", ratioTo: "10" } }),
    ]);
    expect(split?.quantity.toString()).toBe("1000");
    expect(split?.avgCostAsset.toString()).toBe("5");
    expect(split?.costAsset.toString()).toBe("5000");
    expect(split?.realizedAsset.toString()).toBe("0");

    const reverse = pos([
      buy("2024-01-02", "1000", "5"),
      ev({
        type: "REVERSE_SPLIT",
        tradeDate: "2024-02-01",
        meta: { ratioFrom: "10", ratioTo: "1" },
      }),
    ]);
    expect(reverse?.quantity.toString()).toBe("100");
    expect(reverse?.avgCostAsset.toString()).toBe("50");
  });

  it("allocates cost to a spin-off by ratio", () => {
    const result = computeLedger([
      buy("2024-01-02", "100", "10"),
      ev({
        type: "SPIN_OFF",
        tradeDate: "2024-03-01",
        quantity: "20",
        meta: { targetAssetId: "CHILD", costRatio: "0.3" },
      }),
    ]);
    expect(result.positions.get("PETR4")?.costAsset.toString()).toBe("700");
    expect(result.positions.get("PETR4")?.avgCostAsset.toString()).toBe("7");
    expect(result.positions.get("CHILD")?.costAsset.toString()).toBe("300");
    expect(result.positions.get("CHILD")?.avgCostAsset.toString()).toBe("15");
  });

  it("moves a position on ticker change keeping cost", () => {
    const result = computeLedger([
      buy("2024-01-02", "10", "10"),
      ev({ type: "TICKER_CHANGE", tradeDate: "2024-02-01", meta: { targetAssetId: "NEW3" } }),
    ]);
    expect(result.positions.get("PETR4")?.quantity.toString()).toBe("0");
    expect(result.positions.get("NEW3")?.costAsset.toString()).toBe("100");
  });
});

describe("FIFO and specific lots", () => {
  const events = [
    buy("2024-01-02", "10", "10"),
    buy("2024-01-03", "10", "20"),
    sell("2024-01-04", "10", "30"),
  ];
  it("FIFO consumes the oldest lot first", () => {
    const p = pos(events, { method: "FIFO" });
    expect(p?.realizedAsset.toString()).toBe("200");
    expect(p?.avgCostAsset.toString()).toBe("20");
  });
  it("average gives a different result for the same events", () => {
    expect(pos(events, { method: "AVERAGE" })?.realizedAsset.toString()).toBe("150");
  });
  it("specific lot picks the named lot", () => {
    const buys = [buy("2024-01-02", "10", "10"), buy("2024-01-03", "10", "20")];
    const second = buys[1] as LedgerEvent;
    const p = pos(
      [
        ...buys,
        sell("2024-01-04", "10", "30", "0", {
          meta: { lots: [{ lotId: second.id, quantity: "10" }] },
        }),
      ],
      { method: "SPECIFIC_LOT" },
    );
    expect(p?.realizedAsset.toString()).toBe("100");
  });
});

describe("multi-currency cost basis", () => {
  it("converts cost at the buy-date rate and proceeds at the sale-date rate", () => {
    const result = computeLedger([
      buy("2024-01-02", "10", "100", "0", { assetId: "AAPL", currency: "USD", fxRateToBase: "5" }),
      sell("2024-06-03", "10", "120", "0", {
        assetId: "AAPL",
        currency: "USD",
        fxRateToBase: "5.5",
      }),
    ]);
    const p = result.positions.get("AAPL");
    expect(p?.realizedAsset.toString()).toBe("200");
    expect(p?.realizedBase.toString()).toBe("1600"); // 6600 - 5000
    expect(result.cash.USD?.toString()).toBe("200");
  });
});

describe("day trade and validation", () => {
  it("separates same-day buy and sell as day trade", () => {
    const result = computeLedger(
      [buy("2024-01-02", "100", "10"), sell("2024-01-02", "100", "11")],
      { detectDayTrade: true },
    );
    expect(result.sales).toHaveLength(1);
    expect(result.sales[0]?.category).toBe("DAY_TRADE");
    expect(result.sales[0]?.pnlAsset.toString()).toBe("100");
    expect(result.positions.get("PETR4")?.quantity.toString()).toBe("0");
  });

  it("treats the excess of a same-day sale as swing", () => {
    const result = computeLedger(
      [
        buy("2024-01-01", "100", "10"),
        buy("2024-01-02", "50", "12"),
        sell("2024-01-02", "80", "13"),
      ],
      { detectDayTrade: true },
    );
    const dt = result.sales.find((s) => s.category === "DAY_TRADE");
    const swing = result.sales.find((s) => s.category === "SWING");
    expect(dt?.quantity.toString()).toBe("50");
    expect(dt?.pnlAsset.toString()).toBe("50");
    expect(swing?.quantity.toString()).toBe("30");
    expect(swing?.pnlAsset.toString()).toBe("90"); // 30 * (13 - 10)
  });

  it("rejects overselling in strict mode and reports it otherwise", () => {
    const events = [buy("2024-01-02", "10", "10"), sell("2024-01-03", "11", "10")];
    expect(() => computeLedger(events, { strict: true })).toThrow(OversellError);
    expect(computeLedger(events).issues[0]?.code).toBe("OVERSELL");
  });
});

describe("cash ledger", () => {
  it("tracks cash per currency across deposits, trades, income and conversions", () => {
    const result = computeLedger([
      ev({ type: "DEPOSIT", tradeDate: "2024-01-01", assetId: null, grossAmount: "10000" }),
      buy("2024-01-02", "100", "10", "5"),
      ev({ type: "JCP", tradeDate: "2024-02-01", grossAmount: "100", taxesWithheld: "15" }),
      ev({
        type: "FX_CONVERSION",
        tradeDate: "2024-02-02",
        assetId: null,
        grossAmount: "1000",
        meta: { toCurrency: "USD", toAmount: "200" },
      }),
    ]);
    expect(result.cash.BRL?.toString()).toBe("8080"); // 10000 - 1005 + 85 - 1000
    expect(result.cash.USD?.toString()).toBe("200");
    expect(result.income[0]?.net.toString()).toBe("85");
    expect(result.positions.get("PETR4")?.incomeNetAsset.toString()).toBe("85");
  });
});
