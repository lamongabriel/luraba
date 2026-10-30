import { describe, expect, it } from "vitest";
import {
  b3Symbol,
  parseAppCsv,
  parseB3Movimentacao,
  parseB3Negociacao,
  parseCsvTable,
  parseDecimal,
  parseGenericCsv,
  parseJsonBackup,
} from "../imports/parsers";

describe("parseDecimal", () => {
  it.each([
    ["1.234,56", "1234.56"],
    ["1,234.56", "1234.56"],
    ["12,5", "12.5"],
    ["0.25", "0.25"],
    ["R$ 10,00", "10.00"],
    ["1.234.567", "1234567"],
    ["(5,50)", "-5.50"],
    ["abc", null],
    ["", null],
  ])("%s -> %s", (input, expected) => expect(parseDecimal(input)).toBe(expected));
});

describe("B3 files", () => {
  it("reads Negociação trades and strips the fractional-market F", () => {
    const csv = [
      "Data do Negócio;Tipo de Movimentação;Mercado;Prazo/Vencimento;Instituição;Código de Negociação;Quantidade;Preço;Valor",
      "02/01/2026;Compra;Mercado à Vista;-;XP;PETR4;100;38,50;3.850,00",
      "03/01/2026;Venda;Mercado Fracionário;-;XP;VALE3F;5;60,10;300,50",
    ].join("\n");
    const rows = parseB3Negociacao(parseCsvTable(csv));
    expect(rows[0]?.event).toMatchObject({
      type: "BUY",
      symbol: "PETR4",
      quantity: "100",
      unitPrice: "38.50",
      grossAmount: "3850.00",
      tradeDate: "2026-01-02",
    });
    expect(rows[1]?.event).toMatchObject({ type: "SELL", symbol: "VALE3", quantity: "5" });
    expect(b3Symbol("ITUB4F", "")).toBe("ITUB4");
  });

  it("maps Movimentação income and flags what it cannot import", () => {
    const csv = [
      "Entrada/Saída;Data;Movimentação;Produto;Instituição;Quantidade;Preço unitário;Valor da Operação",
      "Credito;10/02/2026;Dividendo;PETR4 - PETROLEO BRASILEIRO S.A. - PETROBRAS;XP;100;0,50;50,00",
      "Credito;11/02/2026;Juros Sobre Capital Próprio;ITUB4 - ITAU UNIBANCO;XP;100;0,10;8,50",
      "Credito;12/02/2026;Rendimento;HGLG11 - CSHG LOGISTICA;XP;10;1,00;10,00",
      "Credito;13/02/2026;Desdobro;PETR4 - PETROLEO;XP;100;-;-",
      "Credito;14/02/2026;Transferência - Liquidação;PETR4 - PETROLEO;XP;100;38,50;3.850,00",
    ].join("\n");
    const rows = parseB3Movimentacao(parseCsvTable(csv));
    expect(rows.map((r) => r.event?.type ?? r.status)).toEqual([
      "DIVIDEND",
      "JCP",
      "FII_INCOME",
      "unsupported",
      "unsupported",
    ]);
    expect(rows[0]?.event).toMatchObject({ symbol: "PETR4", grossAmount: "50.00" });
    expect(rows[3]?.unsupportedType).toBe("Desdobro");
  });

  it("rejects a file with the wrong columns", () => {
    const rows = parseB3Negociacao(parseCsvTable("a;b\n1;2"));
    expect(rows[0]?.status).toBe("error");
  });
});

describe("app, generic and backup formats", () => {
  it("reads the app CSV including cash rows", () => {
    const csv =
      "date,type,symbol,quantity,unit_price,gross_amount,fees,taxes_withheld,currency,notes,external_id\n2026-01-05,BUY,AAPL,10,150.25,,1.00,,USD,First,\n2026-03-01,DEPOSIT,,,,1000,,,USD,,x1";
    const rows = parseAppCsv(parseCsvTable(csv), "USD");
    expect(rows[0]?.event).toMatchObject({ type: "BUY", symbol: "AAPL", fees: "1.00" });
    expect(rows[0]?.event?.grossAmount).toBe("1502.5");
    expect(rows[1]?.event).toMatchObject({
      type: "DEPOSIT",
      grossAmount: "1000",
      externalId: "x1",
    });
  });

  it("maps arbitrary columns and type words", () => {
    const csv = "Day,Action,Ticker,Shares,Price\n15/03/2026,Compra,MSFT,2,400,25";
    const table = parseCsvTable("Day;Action;Ticker;Shares;Price\n15/03/2026;Buy;MSFT;2;400,25");
    void csv;
    const rows = parseGenericCsv(
      table,
      { date: "Day", type: "Action", symbol: "Ticker", quantity: "Shares", unitPrice: "Price" },
      "USD",
    );
    expect(rows[0]?.event).toMatchObject({
      type: "BUY",
      symbol: "MSFT",
      quantity: "2",
      unitPrice: "400.25",
      currencyCode: "USD",
    });
  });

  it("reports bad rows instead of throwing", () => {
    const rows = parseAppCsv(
      parseCsvTable(
        "date,type,symbol,quantity\nnope,BUY,AAPL,1\n2026-01-01,WAT,AAPL,1\n2026-01-01,BUY,,1",
      ),
      "USD",
    );
    expect(rows.map((r) => r.status)).toEqual(["error", "error", "error"]);
  });

  it("reads a JSON backup", () => {
    const rows = parseJsonBackup(
      JSON.stringify({
        events: [
          {
            date: "2026-01-02",
            type: "BUY",
            symbol: "X",
            quantity: "1",
            unit_price: "1",
            unitPrice: "2",
            grossAmount: "2",
          },
        ],
      }),
    );
    expect(rows[0]?.event).toMatchObject({ type: "BUY", symbol: "X", grossAmount: "2" });
    expect(parseJsonBackup("{")[0]?.status).toBe("error");
  });
});
