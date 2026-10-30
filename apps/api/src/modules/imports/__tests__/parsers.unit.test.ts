import { describe, expect, it } from "vitest";
import { normalizeRows } from "../imports.normalize";
import { detectParser } from "../parsers/registry";
import { decodeFileBytes, parseAmount, parseDate, parseDelimited } from "../parsers/text";
import { bankOfx, cardOfx } from "./fixtures";

function parse(name: string, text: string) {
  const adapter = detectParser({ name, text });
  if (!adapter) throw new Error(`no parser for ${name}`);
  return { adapter, statement: adapter.parse({ name, text }) };
}

describe("text helpers", () => {
  it("reads Brazilian and plain decimals into minor units", () => {
    expect(parseAmount("1.600,65", ",")).toBe(160065);
    expect(parseAmount("- 2.150,95", ",")).toBe(-215095);
    expect(parseAmount("5682.14", ".")).toBe(568214);
    expect(parseAmount("-0,65", ",")).toBe(-65);
    expect(parseAmount("abc", ",")).toBeNull();
    expect(parseAmount("1,234", ",")).toBeNull();
  });

  it("reads dates in the formats banks use and rejects impossible ones", () => {
    expect(parseDate("28/10/2026")).toBe("2026-10-28");
    expect(parseDate("2026-10-28")).toBe("2026-10-28");
    expect(parseDate("20261028000000[-3:BRT]")).toBe("2026-10-28");
    expect(parseDate("31/02/2026")).toBeNull();
  });

  it("splits quoted CSV fields", () => {
    expect(parseDelimited('a,"b,""c""",d\n1,2,3\n', ",")).toEqual([
      ["a", 'b,"c"', "d"],
      ["1", "2", "3"],
    ]);
  });

  it("decodes Windows-1252 OFX files", () => {
    const bytes = new Uint8Array([...Buffer.from("CHARSET:1252\n<MEMO>Aplica"), 0xe7, 0xe3, 0x6f]);
    expect(decodeFileBytes(bytes)).toContain("Aplicação");
  });
});

describe("format adapters", () => {
  it("reads a bank OFX (SGML without closing tags) with balance and entities", () => {
    const { adapter, statement } = parse("statement.ofx", bankOfx());
    expect(adapter.id).toBe("ofx");
    expect(statement.sourceKind).toBe("bank_account");
    expect(statement.institution).toBe("Banco Inter");
    expect(statement.accountRef).toBe("12345678");
    expect(statement.balance).toEqual({ amount: 109100, date: "2026-10-29" });
    expect(statement.rows).toHaveLength(5);
    expect(statement.rows[2]?.description).toContain("COFFEE & CO");
    expect(statement.rows[1]?.hints.movement).toBe("investment");
    expect(statement.rows[4]?.hints.movement).toBe("card_payment");
    expect(statement.rows[0]?.hints.paymentMethod).toBe("pix");
  });

  it("reads a card OFX: charges negative, installment parsed, balance as amount owed", () => {
    const { statement } = parse("card.ofx", cardOfx());
    expect(statement.sourceKind).toBe("credit_card");
    expect(statement.balance?.amount).toBe(15642);
    const installment = statement.rows.at(-1);
    expect(installment?.installment).toEqual({ number: 4, total: 12 });
    expect(installment?.seriesBase).toBe("Terabyteshop - NuPay");
    expect(
      statement.rows.find((row) => row.description === "Pagamento recebido")?.hints.movement,
    ).toBe("card_payment");
  });

  it("returns no parser for unknown files", () => {
    expect(detectParser({ name: "notes.txt", text: "hello" })).toBeUndefined();
  });
});

describe("normalizeRows", () => {
  it("keeps repeated bank ids unique and numbers identical lines", () => {
    const { statement } = parse("card.ofx", cardOfx());
    const rows = normalizeRows(statement.rows);
    const keys = rows.map((row) => row.externalKey);
    expect(new Set(keys).size).toBe(keys.length);
    const again = normalizeRows(parse("card.ofx", cardOfx()).statement.rows);
    expect(again.map((row) => row.externalKey)).toEqual(keys);

    const bank = normalizeRows(parse("statement.ofx", bankOfx()).statement.rows);
    const coffees = bank.filter((row) => row.description.includes("COFFEE"));
    expect(new Set(coffees.map((row) => row.fingerprint)).size).toBe(2);
  });
});
