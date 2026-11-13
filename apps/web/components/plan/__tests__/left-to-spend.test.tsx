import type { SafeToSpend } from "@luraba/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LeftToSpend, LeftToSpendSkeleton } from "../left-to-spend";

vi.mock("@/hooks/use-currency-precision", () => ({ useCurrencyPrecision: () => () => 2 }));

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
      source: "frankfurter" as const,
    },
  ],
  missingCurrencies: [],
};

const group = (currencyCode: string, left: number) => ({
  currencyCode,
  thisMonth: {
    spendableBalance: left,
    accountsBalance: left,
    goalFundsHeld: 0,
    incomeReceived: null,
    incomeProjected: null,
    billsRemaining: 0,
    goalsOwed: 0,
    invoicesDue: 0,
    leftToSpend: left,
  },
  nextMonth: {
    projectedIncome: null,
    bills: 0,
    goals: 0,
    cardCharged: 0,
    commitments: 0,
    leftForCard: null,
  },
  accounts: [],
  bills: [],
  invoices: [],
  goals: [],
});

const data = {
  month: "2026-11",
  nextMonth: "2026-12",
  today: "2026-11-12",
  currencies: [group("BRL", 500_000), group("USD", 100_000)],
  combined: {
    fx,
    leftToSpend: {
      total: 200_000,
      byCurrency: [
        { currencyCode: "BRL", amount: 500_000 },
        { currencyCode: "USD", amount: 100_000 },
      ],
    },
    leftForCard: null,
  },
  budgets: { currencyCode: "USD", overspent: [] },
} as unknown as SafeToSpend;

describe("LeftToSpend", () => {
  it("leads with one combined number and keeps a breakdown block per currency", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <LeftToSpend data={data} language="en" />
      </QueryClientProvider>,
    );
    expect(screen.getByText("$2,000.00")).toBeTruthy(); // the single headline in USD
    expect(screen.getByText(/≈ converted at 12 Nov 2026/)).toBeTruthy();
    expect(screen.getAllByText("No plan").length).toBeGreaterThan(0);
    // Each currency's own "Left to spend" row stays in its currency.
    expect(screen.getAllByText("R$5,000.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$1,000.00").length).toBeGreaterThan(0);
  });

  it("has a loading twin with the same headline grid", () => {
    render(<LeftToSpendSkeleton />);
    expect(screen.getByRole("status", { name: /loading what is left to spend/i })).toBeTruthy();
  });
});
