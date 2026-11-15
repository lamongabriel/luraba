import { describe, expect, it } from "vitest";
import { cardOfx } from "@/modules/imports/__tests__/fixtures";
import {
  netIofLines,
  parseCardStatement,
  parseStatementAmount,
  StatementParseError,
} from "../statement.parsers";
import {
  interGlobalSample,
  interNov2026,
  nubankOct2026,
  nubankSep2026,
  xpSample,
} from "./statement.fixtures";

describe("parseStatementAmount", () => {
  it("reads dot and Brazilian decimals, negatives and currency prefixes", () => {
    expect(parseStatementAmount("364.90")).toBe(36490);
    expect(parseStatementAmount("1.234,56")).toBe(123456);
    expect(parseStatementAmount("R$ 1.234,56")).toBe(123456);
    expect(parseStatementAmount("- R$ 10,00")).toBe(-1000);
    expect(parseStatementAmount("-0.65")).toBe(-65);
    expect(parseStatementAmount("abc")).toBeNull();
  });
});

describe("parseCardStatement", () => {
  it("reads a Nubank statement: installments, IOF pair netted, payment left out of the total", () => {
    const statement = parseCardStatement({
      fileName: "Nubank_2026-09-10.csv",
      text: nubankSep2026,
    });
    expect(statement.issuer).toBe("nubank");
    expect(statement.payments).toHaveLength(1);
    expect(statement.netted.map((line) => line.amount).sort()).toEqual([-377, 377]);
    const decolar = statement.lines.find((line) => line.description === "Decolar");
    expect(decolar).toMatchObject({
      amount: 36490,
      installment: { number: 1, total: 2 },
      date: "2026-08-14",
    });
    expect(
      statement.lines.find((line) => line.description === "Coffee shop")?.installment,
    ).toBeNull();
    expect(statement.total).toBe(47863 + 36490 + 10511 + 2663 + 13334 + 1250);
    expect(statement.warnings).toEqual([]);
  });

  it("keeps an unpaired IOF charge as a real line", () => {
    const text = [
      "date,title,amount",
      "2026-09-02,IOF de compra,3.77",
      "2026-09-02,Dinner,40.00",
    ].join("\n");
    const statement = parseCardStatement({ fileName: "a.csv", text });
    expect(statement.netted).toEqual([]);
    expect(statement.lines.map((line) => line.kind)).toEqual(["iof", "purchase"]);
    expect(statement.total).toBe(4377);
  });

  it("pairs IOF refunds with charges of the same amount only", () => {
    const text = [
      "date,title,amount",
      "2026-09-02,IOF,3.77",
      "2026-09-02,IOF,1.00",
      "2026-09-03,Estorno de IOF,-1.00",
    ].join("\n");
    const statement = parseCardStatement({ fileName: "a.csv", text });
    expect(statement.netted).toHaveLength(2);
    expect(statement.lines).toHaveLength(1);
    expect(statement.lines[0]?.amount).toBe(377);
    expect(netIofLines(statement.lines).netted).toEqual([]);
  });

  it("reads Inter with semicolons, BR decimals and the installment in the Tipo column", () => {
    const statement = parseCardStatement({ fileName: "fatura-inter.csv", text: interNov2026 });
    expect(statement.issuer).toBe("inter");
    expect(statement.payments).toHaveLength(1);
    expect(statement.lines.find((line) => line.description === "SHOPEE")).toMatchObject({
      amount: 6634,
      installment: { number: 3, total: 3 },
      date: "2026-08-03",
    });
    expect(statement.total).toBe(6634 + 1890);
  });

  it("reads XP and Inter Global layouts", () => {
    const xp = parseCardStatement({ fileName: "xp.csv", text: xpSample });
    expect(xp.issuer).toBe("xp");
    expect(xp.lines[0]).toMatchObject({ amount: 123456, installment: { number: 2, total: 6 } });
    expect(xp.lines[1]?.installment).toBeNull();
    const global = parseCardStatement({ fileName: "global.csv", text: interGlobalSample });
    expect(global.issuer).toBe("inter_global");
    expect(global.lines).toHaveLength(1);
    expect(global.lines[0]).toMatchObject({ amount: 450, date: "2026-10-05" });
    expect(global.payments).toHaveLength(1);
  });

  it("reads the Oct statement and reports unreadable lines instead of dropping them silently", () => {
    expect(parseCardStatement({ fileName: "o.csv", text: nubankOct2026 }).total).toBe(
      47864 + 36488 + 10510 + 2663 + 13332,
    );
    const bad = parseCardStatement({
      fileName: "o.csv",
      text: "date,title,amount\n2026-10-01,Thing,abc\nnot-a-date,Other,1.00",
    });
    expect(bad.warnings).toHaveLength(2);
  });

  it("reads OFX card statements and refuses PDF and unknown layouts", () => {
    const ofx = parseCardStatement({ fileName: "card.ofx", text: cardOfx() });
    expect(ofx.issuer).toBe("ofx");
    expect(ofx.lines.length).toBeGreaterThan(0);
    expect(() => parseCardStatement({ fileName: "fatura.pdf", text: "%PDF-1.4" })).toThrow(
      StatementParseError,
    );
    expect(() => parseCardStatement({ fileName: "x.csv", text: "a,b\n1,2" })).toThrow(
      StatementParseError,
    );
  });
});
