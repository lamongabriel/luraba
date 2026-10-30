import { type ImportColumnMapping, missingImportFields } from "@luraba/contracts/imports";
import { describe, expect, it } from "vitest";
import {
  applyMapping,
  parseDateWith,
  suggestDateFormat,
  suggestDecimalSeparator,
  suggestMapping,
} from "../imports.columns";
import { buildTable, readTable } from "../imports.table";

const mapping = (overrides: Partial<ImportColumnMapping> = {}): ImportColumnMapping => ({
  columns: { date: "Date", description: "Description", amount: "Amount" },
  dateFormat: "MM/DD/YYYY",
  decimalSeparator: ".",
  amountSign: "negative_is_out",
  outflowValues: [],
  ...overrides,
});

describe("reading tables", () => {
  it("detects the delimiter and dedupes headers", async () => {
    const csv = "Data;Descrição;Valor;Valor\n28/10/2026;Coffee;-12,90;1\n";
    const table = await readTable("csv", Buffer.from(csv));
    expect(table.headers).toEqual(["Data", "Descrição", "Valor", "Valor (2)"]);
    expect(table.rows[0]).toEqual(["28/10/2026", "Coffee", "-12,90", "1"]);
  });

  it("needs a header and one data row", () => {
    expect(() => buildTable([["a", "b"]])).toThrow();
    expect(buildTable([["a", ""], ["1"]]).headers).toEqual(["a", "Column 2"]);
  });
});

describe("suggesting a mapping", () => {
  it("reads Portuguese headers and brazilian numbers", async () => {
    const table = await readTable(
      "csv",
      Buffer.from(
        'Data,Descrição,Valor,Categoria,Banco\n28/10/2026,Padaria,"-1.250,90",Food,Inter\n',
      ),
    );
    const suggestion = suggestMapping(table);
    expect(suggestion.columns).toEqual({
      date: "Data",
      description: "Descrição",
      amount: "Valor",
      category: "Categoria",
      merchant: "Banco",
    });
    expect(suggestion.dateFormat).toBe("DD/MM/YYYY");
    expect(suggestion.decimalSeparator).toBe(",");
    expect(missingImportFields(suggestion)).toEqual([]);
  });

  it("falls back to money out and in, and finds outflow values", async () => {
    const table = await readTable(
      "csv",
      Buffer.from("Date,Details,Debit,Credit\n2026-10-28,Coffee,12.50,\n"),
    );
    const suggestion = suggestMapping(table);
    expect(suggestion.columns.debit).toBe("Debit");
    expect(suggestion.columns.credit).toBe("Credit");
    expect(missingImportFields(suggestion)).toEqual([]);

    const typed = await readTable(
      "csv",
      Buffer.from(
        "Date,Memo,Amount,Type\n2026-10-28,Coffee,12.50,Debit\n2026-10-29,Pay,100.00,Credit\n",
      ),
    );
    expect(suggestMapping(typed).outflowValues).toEqual(["Debit"]);
  });

  it("reports what is missing", () => {
    expect(missingImportFields({ columns: { date: "A" } })).toEqual(["Description", "Amount"]);
  });

  it("guesses dates and decimals from samples", () => {
    expect(suggestDateFormat(["10/28/2026", "11/02/2026"])).toBe("MM/DD/YYYY");
    expect(suggestDateFormat(["28/10/2026"])).toBe("DD/MM/YYYY");
    expect(suggestDateFormat(["2026-10-28"])).toBe("YYYY-MM-DD");
    expect(suggestDecimalSeparator(["1,234.50", "9.99"])).toBe(".");
    expect(suggestDecimalSeparator(["1.234,50"])).toBe(",");
  });
});

describe("installments", () => {
  const card = [
    "date,title,amount",
    '2026-09-28,Terabyteshop - NuPay - Parcela 4/12,"29,59"',
    '2026-10-23,Ebn*Spotify,"12,90"',
    '2026-09-29,Pagamento recebido,"- 2.150,95"',
  ].join("\n");

  it("suggests positive-is-out for cards but never switches on reading installments from text", async () => {
    const table = await readTable("csv", Buffer.from(card));
    const suggestion = suggestMapping(table, { creditCard: true });
    expect(suggestion.amountSign).toBe("positive_is_out");
    expect(suggestion.installmentsFromDescription).toBe(false);
    expect(suggestMapping(table).amountSign).toBe("negative_is_out");
  });

  it("splits the plan name from the installment and keeps the file's text", async () => {
    const table = await readTable("csv", Buffer.from(card));
    const rows = applyMapping(table, {
      ...suggestMapping(table, { creditCard: true }),
      decimalSeparator: ",",
      installmentsFromDescription: true,
    });
    expect(rows[0]).toMatchObject({
      amount: -2959,
      description: "Terabyteshop - NuPay - Parcela 4/12",
      installment: { number: 4, total: 12 },
      seriesBase: "Terabyteshop - NuPay",
    });
    expect(rows[1]?.installment).toBeNull();
    expect(rows[2]?.amount).toBe(215095);
  });

  it("reads an Installment column and flags a bad one", () => {
    const table = {
      headers: ["Date", "Description", "Amount", "Parcela"],
      rows: [
        ["10/28/2026", "Decolar", "10.00", "2/6"],
        ["10/28/2026", "Other", "10.00", "7/6"],
      ],
    };
    const rows = applyMapping(
      table,
      mapping({
        columns: {
          date: "Date",
          description: "Description",
          amount: "Amount",
          installment: "Parcela",
        },
      }),
    );
    expect(rows[0]).toMatchObject({ installment: { number: 2, total: 6 }, seriesBase: "Decolar" });
    expect(rows[1]?.problems).toEqual(['Bad installment: "7/6"']);
  });
});

describe("applying a mapping", () => {
  const table = {
    headers: ["Date", "Description", "Amount", "Merchant", "Category", "Tags", "ID", "Type"],
    rows: [
      ["10/28/2026", "STARBUCKS #123", "-4.50", "Starbucks", "Food", "work, coffee", "a1", "Debit"],
      ["10/29/2026", "Salary", "1500.00", "", "", "", "a2", "Credit"],
      ["13/45/2026", "Broken", "abc", "", "", "", "", ""],
    ],
  };

  it("reads signed amounts, values and problems", () => {
    const rows = applyMapping(
      table,
      mapping({
        columns: {
          date: "Date",
          description: "Description",
          amount: "Amount",
          merchant: "Merchant",
          category: "Category",
          tags: "Tags",
          externalId: "ID",
        },
      }),
    );
    expect(rows[0]).toMatchObject({
      date: "2026-10-28",
      amount: -450,
      counterparty: "Starbucks",
      externalId: "a1",
      hints: { categoryValue: "Food", tagValues: ["work", "coffee"] },
      problems: [],
    });
    expect(rows[1]?.amount).toBe(150000);
    expect(rows[2]?.problems).toEqual(['Bad date: "13/45/2026"', 'Bad amount: "abc"']);
  });

  it("uses the type column and the sign convention", () => {
    const typed = applyMapping(
      table,
      mapping({
        columns: { date: "Date", description: "Description", amount: "Amount", direction: "Type" },
        outflowValues: ["Debit"],
      }),
    );
    expect(typed.map((row) => row.amount)).toEqual([-450, 150000, null]);
    const flipped = applyMapping(table, mapping({ amountSign: "positive_is_out" }));
    expect(flipped[0]?.amount).toBe(450);
  });

  it("builds the amount from money out and in", () => {
    const split = applyMapping(
      {
        headers: ["Date", "Description", "Out", "In"],
        rows: [
          ["2026-10-28", "Coffee", "12,50", ""],
          ["2026-10-29", "Pay", "", "1.000,00"],
        ],
      },
      mapping({
        columns: { date: "Date", description: "Description", debit: "Out", credit: "In" },
        dateFormat: "YYYY-MM-DD",
        decimalSeparator: ",",
      }),
    );
    expect(split.map((row) => row.amount)).toEqual([-1250, 100000]);
  });

  it("parses each date format and rejects impossible dates", () => {
    expect(parseDateWith("28.10.2026", "DD.MM.YYYY")).toBe("2026-10-28");
    expect(parseDateWith("2026-10-28T10:00:00", "YYYY-MM-DD")).toBe("2026-10-28");
    expect(parseDateWith("02/30/2026", "MM/DD/YYYY")).toBeNull();
    expect(parseDateWith("28/10/2026", "MM/DD/YYYY")).toBeNull();
  });
});
