import type { CreditCardCycle } from "@luraba/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render as baseRender, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { InvoiceSummary } from "../invoice-detail";
import { LimitBreakdown } from "../limit-breakdown";

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const render = (ui: ReactElement) =>
  baseRender(
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>{ui}</TooltipProvider>
    </QueryClientProvider>,
  );

const cycle = (overrides: Partial<CreditCardCycle>): CreditCardCycle => ({
  id: crypto.randomUUID(),
  creditCardId: crypto.randomUUID(),
  periodStart: "2026-09-29",
  periodEnd: "2026-10-28",
  closingDate: "2026-10-28",
  dueDate: "2026-11-05",
  status: "closed",
  statementAmount: 69_593,
  paidAmount: 0,
  remainingAmount: 69_593,
  displayStatus: "due",
  isCurrent: false,
  isNext: false,
  hasActivity: true,
  ...overrides,
});

describe("LimitBreakdown", () => {
  it("lists each part of the limit with its amount", () => {
    render(
      <LimitBreakdown
        breakdown={{
          limit: 1_550_000,
          closedInvoice: 69_593,
          openInvoice: 54_573,
          futureInvoices: 109_146,
          used: 233_312,
          available: 1_316_688,
        }}
        currencyCode="USD"
        language="en"
        precision={2}
      />,
    );

    expect(screen.getByText("Closed invoice")).toBeInTheDocument();
    expect(screen.getByText("Open invoice")).toBeInTheDocument();
    expect(screen.getByText("Future invoices")).toBeInTheDocument();
    expect(screen.getByText("Available")).toBeInTheDocument();
    expect(screen.getByText("$13,166.88")).toBeInTheDocument();
  });

  it("says so and hides availability when the card has no limit", () => {
    render(
      <LimitBreakdown
        breakdown={{
          limit: null,
          closedInvoice: 0,
          openInvoice: 100,
          futureInvoices: 0,
          used: 100,
          available: null,
        }}
        currencyCode="USD"
        language="en"
        precision={2}
      />,
    );

    expect(screen.getByText("No limit set")).toBeInTheDocument();
    expect(screen.queryByText("Available")).not.toBeInTheDocument();
  });
});

describe("InvoiceSummary", () => {
  it("shows the invoice name, status and facts once, and offers to pay an unpaid invoice", () => {
    render(
      <InvoiceSummary
        cycle={cycle({ displayStatus: "overdue", remainingAmount: 50_000, paidAmount: 19_593 })}
        previousAmount={50_000}
        details={undefined}
        cardName="Chase Sapphire"
        onPay={vi.fn()}
        currencyCode="USD"
        language="en"
        precision={2}
      />,
    );

    expect(screen.getByText("November 2026 invoice")).toBeInTheDocument();
    expect(screen.getAllByText("Overdue").length).toBeGreaterThan(0);
    expect(screen.getByText("Invoice total")).toBeInTheDocument();
    expect(screen.getByText("Closing date")).toBeInTheDocument();
    expect(screen.getByText(/↑ 39% vs previous/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pay invoice" })).toBeInTheDocument();
  });

  it("does not offer to pay a paid invoice", () => {
    render(
      <InvoiceSummary
        cycle={cycle({ displayStatus: "paid", remainingAmount: 0, paidAmount: 69_593 })}
        previousAmount={null}
        details={undefined}
        cardName="Chase Sapphire"
        onPay={vi.fn()}
        currencyCode="USD"
        language="en"
        precision={2}
      />,
    );

    expect(screen.queryByRole("button", { name: "Pay invoice" })).not.toBeInTheDocument();
  });
});
