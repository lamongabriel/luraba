import { describe, expect, it } from "vitest";
import {
  detectRoundingPattern,
  learnRoundingPattern,
  type MatchableInstallment,
  matchStatement,
  parseInstallmentPlanText,
  type StatementLine,
  splitInstallmentAmounts,
} from "../index.js";

let seq = 0;
function line(
  description: string,
  amount: number,
  installment: [number, number] | null,
  index = seq++,
): StatementLine {
  return {
    index,
    date: "2026-09-01",
    description,
    amount,
    installment: installment ? { number: installment[0], total: installment[1] } : null,
    kind: "purchase",
  };
}
function inst(
  id: string,
  description: string,
  number: number,
  count: number,
  amount: number,
  merchantName: string | null = null,
): MatchableInstallment {
  return {
    installmentId: id,
    purchaseId: `p-${description}`,
    installmentNumber: number,
    installmentCount: count,
    amount,
    description,
    originalDescription: null,
    merchantName,
  };
}

describe("matchStatement", () => {
  it("matches exact, corrects cents, sends big differences to review", () => {
    const result = matchStatement(
      [
        line("Decolar", 36490, [1, 2], 0),
        line("Wiper blades", 10511, [1, 2], 1),
        line("Kabum", 47800, [3, 10], 2),
        line("Touti", 2663, [1, 3], 3),
      ],
      [
        inst("a", "Decolar", 1, 2, 36489),
        inst("b", "Wiper blades", 1, 2, 10511),
        inst("c", "Kabum", 3, 10, 47864),
        inst("d", "Touti", 1, 3, 2663),
      ],
    );
    const byLine = Object.fromEntries(result.matches.map((m) => [m.lineIndex, m]));
    expect(byLine[0]).toMatchObject({ status: "corrected", difference: 1 });
    expect(byLine[1]).toMatchObject({ status: "matched", difference: 0 });
    expect(byLine[2]).toMatchObject({ status: "review", difference: -64 });
    expect(byLine[3]).toMatchObject({ status: "matched" });
    expect(result.missing).toEqual([]);
    expect(result.extra).toEqual([]);
  });

  it("reports missing lines and installments not on the statement", () => {
    const result = matchStatement([line("Spotify", 2190, null, 0)], [inst("x", "Gym", 2, 6, 9000)]);
    expect(result.matches).toEqual([]);
    expect(result.missing).toEqual([0]);
    expect(result.extra).toEqual(["x"]);
  });

  it("requires the same installment number and count", () => {
    const result = matchStatement(
      [line("Decolar", 36490, [2, 3], 0)],
      [inst("a", "Decolar", 1, 3, 36490), inst("b", "Decolar", 2, 4, 36490)],
    );
    expect(result.matches).toEqual([]);
  });

  it("breaks ties deterministically for identical purchases", () => {
    const installments = [inst("b", "Coffee", 1, 3, 1000), inst("a", "Coffee", 1, 3, 1000)];
    const lines = [line("Coffee", 1000, [1, 3], 0), line("Coffee", 1000, [1, 3], 1)];
    const first = matchStatement(lines, installments);
    const second = matchStatement([...lines].reverse(), [...installments].reverse());
    const pairs = (r: typeof first) =>
      r.matches.map((m) => `${m.lineIndex}:${m.installmentId}`).sort();
    expect(pairs(first)).toEqual(["0:a", "1:b"]);
    expect(pairs(second)).toEqual(pairs(first));
  });

  it("prefers an exact amount over a closer text with a rounding difference", () => {
    const result = matchStatement(
      [line("Shop one", 1000, [1, 2], 0)],
      [inst("a", "Shop one", 1, 2, 998), inst("b", "Shop one hotel", 1, 2, 1000)],
    );
    expect(result.matches[0]).toMatchObject({ installmentId: "b", status: "matched" });
    expect(result.extra).toEqual(["a"]);
  });

  it("uses the merchant name and ignores unrelated text with a large difference", () => {
    const result = matchStatement(
      [line("MP*SHOPEE", 6634, [1, 3], 0), line("Totally different", 9900, [1, 3], 1)],
      [inst("s", "Phone case", 1, 3, 6636, "Shopee")],
    );
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]).toMatchObject({
      installmentId: "s",
      status: "corrected",
      difference: -2,
    });
    expect(result.missing).toEqual([1]);
  });
});

describe("rounding pattern", () => {
  it("detects first, last, middle, equal and irregular", () => {
    expect(detectRoundingPattern([36490, 36488]).kind).toBe("first");
    expect(detectRoundingPattern([13334, 13332, 13332]).kind).toBe("first");
    expect(detectRoundingPattern([6634, 6634, 6636]).kind).toBe("last");
    expect(detectRoundingPattern([47863, 47863, 47864, 47863])).toEqual({
      kind: "middle",
      position: 3,
    });
    expect(detectRoundingPattern([2663, 2663, 2663]).kind).toBe("equal");
    expect(detectRoundingPattern([100, 500, 900]).kind).toBe("irregular");
  });

  it("learns the majority pattern and its default mode", () => {
    expect(learnRoundingPattern(["first", "first", "last"])).toEqual({
      pattern: "first",
      roundingMode: "remainder_first",
      samples: 2,
    });
    expect(learnRoundingPattern(["last", "first"])?.pattern).toBe("first");
    expect(learnRoundingPattern(["equal", "equal"])).toMatchObject({
      pattern: "none",
      roundingMode: "round_down_all",
    });
    expect(learnRoundingPattern(["equal"])).toBeNull();
    expect(learnRoundingPattern(["equal", "equal", "first"])?.pattern).toBe("first");
    expect(learnRoundingPattern(["middle"])).toMatchObject({
      pattern: "middle",
      roundingMode: null,
    });
  });

  it("round_down_all drops the leftover cents", () => {
    expect(splitInstallmentAmounts(7990, 3, "round_down_all")).toEqual([2663, 2663, 2663]);
  });
});

describe("parseInstallmentPlanText", () => {
  it("reads first + rest", () => {
    expect(parseInstallmentPlanText("1st installment 364.90, rest 364.88", 2)).toEqual({
      ok: true,
      amounts: [36490, 36488],
    });
    expect(parseInstallmentPlanText("first $105.11 then rest 105,10", 2)).toEqual({
      ok: true,
      amounts: [10511, 10510],
    });
  });
  it("reads a middle installment and last", () => {
    const result = parseInstallmentPlanText("3rd 478.64, others 478.63", 10);
    expect(result.ok && result.amounts[2]).toBe(47864);
    expect(result.ok && result.amounts.filter((v) => v === 47863)).toHaveLength(9);
    expect(parseInstallmentPlanText("last 66.36, rest 66.34", 3)).toEqual({
      ok: true,
      amounts: [6634, 6634, 6636],
    });
  });
  it("reads repeats and plain lists without a count", () => {
    expect(parseInstallmentPlanText("26.63 x3")).toEqual({ ok: true, amounts: [2663, 2663, 2663] });
    expect(parseInstallmentPlanText("3x 26.63")).toEqual({ ok: true, amounts: [2663, 2663, 2663] });
    expect(parseInstallmentPlanText("133.34, 133.33, 133.33")).toEqual({
      ok: true,
      amounts: [13334, 13333, 13333],
    });
    expect(parseInstallmentPlanText("364.90 then 364.88 x2")).toEqual({
      ok: true,
      amounts: [36490, 36488, 36488],
    });
  });
  it("explains what is wrong", () => {
    expect(parseInstallmentPlanText("1st 10.00, rest 9.00")).toMatchObject({ ok: false });
    expect(parseInstallmentPlanText("1st 10.00", 3)).toMatchObject({ ok: false });
    expect(parseInstallmentPlanText("banana", 3)).toMatchObject({ ok: false });
    expect(parseInstallmentPlanText("1st 10.00, 2nd 10.00, 3rd 10.00", 2)).toMatchObject({
      ok: false,
    });
  });
});
