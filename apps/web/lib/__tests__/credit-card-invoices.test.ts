import { describe, expect, it } from "vitest";
import {
  buildInvoiceCsv,
  buildInvoiceLines,
  compareInvoices,
  formatMonthKeyLabel,
  invoiceMonthKey,
  shiftMonthKey,
} from "../credit-card-invoices";

const item = (overrides: Partial<Parameters<typeof buildInvoiceLines>[0]["items"][number]>) => ({
  installmentId: crypto.randomUUID(),
  purchaseId: crypto.randomUUID(),
  transactionId: crypto.randomUUID(),
  description: "Coffee",
  categoryId: null,
  merchantId: null,
  installmentNumber: 1,
  installmentCount: 1,
  amount: 450,
  purchaseDate: "2026-10-10",
  postedDate: "2026-10-10",
  ...overrides,
});

describe("month keys", () => {
  it("shifts across year boundaries", () => {
    expect(shiftMonthKey("2026-12", 1)).toBe("2027-01");
    expect(shiftMonthKey("2026-01", -1)).toBe("2025-12");
    expect(shiftMonthKey("2026-10", 14)).toBe("2027-12");
  });

  it("names an invoice after its due month and formats labels", () => {
    expect(invoiceMonthKey({ dueDate: "2026-11-05" })).toBe("2026-11");
    expect(formatMonthKeyLabel("2026-11")).toBe("November 2026");
    expect(formatMonthKeyLabel("2026-11", "en", "short")).toBe("Nov 26");
  });
});

describe("compareInvoices", () => {
  it("reports spending more, less, the same, or no base", () => {
    expect(compareInvoices(150, 100)).toEqual({ direction: "up", percent: 50 });
    expect(compareInvoices(75, 100)).toEqual({ direction: "down", percent: -25 });
    expect(compareInvoices(100, 100)).toEqual({ direction: "same", percent: 0 });
    expect(compareInvoices(100, 0)).toEqual({ direction: "up", percent: null });
    expect(compareInvoices(100, null)).toBeNull();
  });
});

describe("buildInvoiceLines", () => {
  const details = {
    items: [
      item({ description: "Phone", installmentNumber: 3, installmentCount: 12, amount: 8000 }),
      item({ description: "Coffee", purchaseDate: "2026-10-20" }),
      item({ description: "Lunch", purchaseDate: "2026-10-20", amount: 1200 }),
    ],
    payments: [
      {
        paymentId: crypto.randomUUID(),
        transactionId: crypto.randomUUID(),
        description: "Invoice payment",
        paymentDate: "2026-10-25",
        amount: 2000,
      },
    ],
  };

  it("groups by day with the newest day first and labels installments", () => {
    const groups = buildInvoiceLines(details);
    expect(groups.map((group) => group.date)).toEqual(["2026-10-25", "2026-10-20", "2026-10-10"]);
    expect(groups[1]?.lines).toHaveLength(2);
    expect(groups[2]?.lines[0]).toMatchObject({ installmentLabel: "3/12" });
    expect(groups[1]?.lines[0]).toMatchObject({ installmentLabel: null });
  });

  it("exports a CSV with payments as negative amounts and escaped text", () => {
    const csv = buildInvoiceCsv({
      ...details,
      items: [item({ description: 'Book, "new"', amount: 1999 })],
    });
    expect(csv.split("\n")).toEqual([
      "Date,Description,Type,Installment,Amount",
      '2026-10-10,"Book, ""new""",Purchase,,19.99',
      "2026-10-25,Invoice payment,Payment,,-20.00",
    ]);
  });
});
