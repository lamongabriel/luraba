import type { CreditCardCycle, TransactionFeedRow } from "@luraba/contracts";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { InvoiceStrip } from "../invoice-strip";
import { dedupeCardRows } from "../latest-card-transactions";
import { LimitBreakdown } from "../limit-breakdown";

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

describe("InvoiceStrip", () => {
  it("shows each invoice's status and selects on click", async () => {
    Element.prototype.scrollIntoView = vi.fn();
    const paid = cycle({ displayStatus: "paid", dueDate: "2026-10-05" });
    const overdue = cycle({ displayStatus: "overdue", dueDate: "2026-11-05" });
    const onSelect = vi.fn();
    render(
      <InvoiceStrip
        cycles={[paid, overdue]}
        selectedId={paid.id}
        onSelect={onSelect}
        currencyCode="USD"
        language="en"
        precision={2}
      />,
    );

    expect(screen.getByText("Paid")).toBeInTheDocument();
    expect(screen.getByText("Overdue")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Nov 26/ }));
    expect(onSelect).toHaveBeenCalledWith(overdue.id);
  });
});

describe("dedupeCardRows", () => {
  it("keeps one row per purchase or payment, newest first", () => {
    const row = (rowId: string, purchaseId: string | null, paymentId: string | null) =>
      ({ rowId, purchaseId, paymentId }) as TransactionFeedRow;
    const rows = [
      row("a1", "p1", null),
      row("a2", "p1", null),
      row("b", null, "pay1"),
      row("c", "p2", null),
    ];

    expect(dedupeCardRows(rows, 3).map((item) => item.rowId)).toEqual(["a1", "b", "c"]);
    expect(dedupeCardRows(rows, 2)).toHaveLength(2);
  });
});
