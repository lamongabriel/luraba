import { describe, expect, it } from "vitest";
import { computeLedger } from "../investments/ledger.js";
import type { LedgerEvent } from "../investments/types.js";

function addDays(date: string, n: number): string {
  return new Date(Date.parse(date) + n * 86_400_000).toISOString().slice(0, 10);
}

/** Deterministic pseudo-random stream so the test never flakes. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function buildEvents(count: number): LedgerEvent[] {
  const rand = rng(42);
  const events: LedgerEvent[] = [];
  const held = new Map<string, number>();
  const assets = Array.from({ length: 25 }, (_, i) => `ASSET${i}`);
  for (let i = 0; i < count; i++) {
    const asset = assets[Math.floor(rand() * assets.length)] as string;
    const date = addDays("2018-01-02", Math.floor(i / 4));
    const have = held.get(asset) ?? 0;
    const sellNow = have > 20 && rand() < 0.4;
    const qty = sellNow ? Math.max(1, Math.floor(have * 0.3)) : Math.floor(rand() * 90) + 10;
    const price = (10 + rand() * 90).toFixed(2);
    held.set(asset, sellNow ? have - qty : have + qty);
    events.push({
      id: `e${i}`,
      type: sellNow ? "SELL" : "BUY",
      assetId: asset,
      tradeDate: date,
      quantity: String(qty),
      unitPrice: price,
      grossAmount: (qty * Number(price)).toFixed(2),
      fees: "1",
      currency: "BRL",
    });
  }
  return events;
}

describe("ledger at scale", () => {
  const events = buildEvents(12_000);

  it("replays 12,000 events with each cost-basis method in a few seconds at most", () => {
    for (const method of ["AVERAGE", "FIFO"] as const) {
      const started = performance.now();
      const result = computeLedger(events, { method });
      const elapsed = performance.now() - started;
      // The generator records no deposits, so cash goes negative; sales must always be covered.
      expect(result.issues.filter((issue) => issue.code !== "NEGATIVE_CASH")).toEqual([]);
      expect(result.positions.size).toBe(25);
      expect(elapsed).toBeLessThan(4000);
    }
  });

  it("checkpoints in the single pass equal a replay cut at the same date", () => {
    const checkpoints = ["2019-06-30", "2021-01-15", "2023-12-31"];
    const full = computeLedger(events, { method: "FIFO", checkpoints });
    for (const date of checkpoints) {
      const cut = computeLedger(
        events.filter((e) => e.tradeDate <= date),
        { method: "FIFO" },
      );
      const snapshot = full.snapshots.find((s) => s.date === date);
      expect(snapshot).toBeDefined();
      for (const position of snapshot?.positions ?? []) {
        const expected = cut.positions.get(position.assetId);
        expect(position.quantity.toFixed()).toBe(expected?.quantity.toFixed());
        expect(position.costAsset.toFixed()).toBe(expected?.costAsset.toFixed());
      }
    }
  });

  it("is deterministic: replaying the same events gives the same result", () => {
    const a = computeLedger(events, { method: "AVERAGE" });
    const b = computeLedger(events, { method: "AVERAGE" });
    for (const [id, position] of a.positions) {
      expect(b.positions.get(id)?.quantity.toFixed()).toBe(position.quantity.toFixed());
      expect(b.positions.get(id)?.costAsset.toFixed()).toBe(position.costAsset.toFixed());
    }
  });
});
