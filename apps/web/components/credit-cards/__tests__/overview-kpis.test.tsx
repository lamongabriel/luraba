import type { CreditCardInsights, CreditCardOverview } from "@luraba/contracts";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OverviewKpis } from "../overview-kpis";

const fx = {
  baseCurrencyCode: "USD",
  basePrecision: 2,
  asOf: "2026-11-12",
  rates: [
    {
      currencyCode: "BRL",
      rateNumerator: 1,
      rateDenominator: 5,
      precision: 2,
      rate: 0.2,
      rateDate: "2026-11-12",
      source: "manual" as const,
    },
  ],
  missingCurrencies: [],
};

const amount = (total: number | null, usd: number, brl: number) => ({
  total,
  byCurrency: [
    { currencyCode: "BRL", amount: brl },
    { currencyCode: "USD", amount: usd },
  ],
});

const card = (name: string, currencyCode: string, remaining: number, dueDate: string) => ({
  creditCardId: "00000000-0000-4000-8000-000000000001",
  name,
  currencyCode,
  invoice: {
    cycleId: "00000000-0000-4000-8000-000000000002",
    displayStatus: "due",
    closingDate: "2026-11-01",
    dueDate,
    statementAmount: remaining,
    paidAmount: 0,
    remainingAmount: remaining,
  },
});

function overview(over: Partial<CreditCardOverview["combined"]> = {}) {
  return {
    month: "2026-11",
    cards: [card("Chase", "USD", 10_000, "2026-11-20"), card("Nu", "BRL", 100_000, "2026-11-10")],
    totals: [],
    combined: {
      fx,
      invoiceAmount: amount(30_000, 10_000, 100_000),
      invoicePaidAmount: amount(0, 0, 0),
      invoiceRemainingAmount: amount(30_000, 10_000, 100_000),
      limitTotal: amount(100_000, 50_000, 250_000),
      limitAvailable: amount(80_000, 40_000, 200_000),
      ...over,
    },
  } as unknown as CreditCardOverview;
}

describe("OverviewKpis", () => {
  it("shows one number per figure in the base currency, with the conversion note", () => {
    render(<OverviewKpis overview={overview()} insights={undefined} language="en" />);
    const strip = screen.getByLabelText("Invoice totals");

    expect(within(strip).getAllByText("$300.00").length).toBe(2); // invoices and still to pay
    expect(within(strip).queryByText("R$1,000.00")).toBeNull(); // the BRL amount is behind the popover
    expect(within(strip).getAllByText(/≈ converted at 12 Nov 2026/).length).toBeGreaterThan(0);
    expect(within(strip).getByText("$800.00")).toBeTruthy(); // available limit
    expect(within(strip).getByText("Nu")).toBeTruthy(); // next due date: the earliest across currencies
  });

  it("shows the change against last month from the combined insights", () => {
    const insights = {
      month: "2026-11",
      groups: [],
      combined: {
        fx,
        total: amount(30_000, 10_000, 100_000),
        previousTotal: amount(20_000, 10_000, 50_000),
      },
    } as unknown as CreditCardInsights;
    render(<OverviewKpis overview={overview()} insights={insights} language="en" />);
    expect(screen.getByText(/↑ 50% vs last month/)).toBeTruthy();
  });

  it("falls back to the amounts of each currency, with a hint, when a rate is missing", () => {
    const missing = { ...fx, rates: [], asOf: null, missingCurrencies: ["BRL"] };
    render(
      <OverviewKpis
        overview={overview({
          fx: missing,
          invoiceAmount: amount(null, 10_000, 100_000),
          invoiceRemainingAmount: amount(null, 10_000, 100_000),
        })}
        insights={undefined}
        language="en"
      />,
    );
    expect(screen.getAllByText("R$1,000.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Rate unavailable for BRL/).length).toBeGreaterThan(0);
  });

  it("says so when no card has a limit", () => {
    const none = { total: 0, byCurrency: [] };
    render(
      <OverviewKpis
        overview={overview({ limitTotal: none, limitAvailable: none })}
        insights={undefined}
        language="en"
      />,
    );
    expect(screen.getByText("No limit set")).toBeTruthy();
  });
});
