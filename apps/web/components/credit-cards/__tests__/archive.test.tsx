import {
  accountsEndpoints,
  type CreditCardOverviewCard,
  creditCardsEndpoints,
} from "@luraba/contracts";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setAccountArchived } from "@/services/accounts.service";
import { setCreditCardArchived } from "@/services/credit-cards.service";
import { CreditCardTile } from "../credit-card-tile";

const requestContract = vi.fn();
vi.mock("@/services/contract-client.service", () => ({
  requestContract: (...args: unknown[]) => requestContract(...args),
}));

beforeEach(() => requestContract.mockReset());

const card = (archived: boolean): CreditCardOverviewCard => ({
  creditCardId: crypto.randomUUID(),
  name: "Old Visa",
  archived,
  institutionName: "Chase",
  institutionLogoUrl: null,
  brand: "Visa",
  last4: "4242",
  color: null,
  currencyCode: "USD",
  closingDay: 10,
  dueDay: 20,
  invoice: null,
  limit: {
    limit: 100_000,
    closedInvoice: 0,
    openInvoice: 0,
    futureInvoices: 0,
    used: 0,
    available: 100_000,
  },
  creditBalance: 0,
});

describe("archive services", () => {
  it("picks the archive or unarchive endpoint for accounts", async () => {
    await setAccountArchived("a1", true);
    await setAccountArchived("a1", false);
    expect(requestContract.mock.calls.map((call) => call[0])).toEqual([
      accountsEndpoints.archive,
      accountsEndpoints.unarchive,
    ]);
    expect(requestContract.mock.calls[0]?.[1]).toEqual({ params: { id: "a1" } });
  });

  it("picks the archive or unarchive endpoint for credit cards", async () => {
    await setCreditCardArchived("c1", true);
    await setCreditCardArchived("c1", false);
    expect(requestContract.mock.calls.map((call) => call[0])).toEqual([
      creditCardsEndpoints.archive,
      creditCardsEndpoints.unarchive,
    ]);
  });
});

describe("CreditCardTile archived state", () => {
  it("labels an archived card and leaves an active one alone", () => {
    const { rerender } = render(<CreditCardTile card={card(true)} language="en" precision={2} />);
    expect(screen.getByText("Archived")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Old Visa (archived)" })).toBeInTheDocument();

    rerender(<CreditCardTile card={card(false)} language="en" precision={2} />);
    expect(screen.queryByText("Archived")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Old Visa" })).toBeInTheDocument();
  });
});

describe("CreditCardTile rounding mismatch", () => {
  const withInvoice = (overrides: Partial<NonNullable<CreditCardOverviewCard["invoice"]>>) => ({
    ...card(false),
    invoice: {
      cycleId: crypto.randomUUID(),
      dueDate: "2026-09-05",
      closingDate: "2026-08-25",
      statementAmount: 6_634,
      paidAmount: 6_634,
      remainingAmount: 0,
      status: "closed",
      displayStatus: "paid",
      reconciledAt: null,
      roundingMismatch: -1,
      ...overrides,
    } as NonNullable<CreditCardOverviewCard["invoice"]>,
  });

  it("flags a paid invoice that is a few cents off the issuer instead of saying paid in full", () => {
    render(<CreditCardTile card={withInvoice({})} language="en" precision={2} />);
    expect(screen.getByText("Rounding mismatch - import statement")).toBeInTheDocument();
    expect(screen.queryByText("Paid in full")).not.toBeInTheDocument();
  });

  it("says paid in full when nothing is off, and stays quiet once reconciled", () => {
    const { rerender } = render(
      <CreditCardTile card={withInvoice({ roundingMismatch: null })} language="en" precision={2} />,
    );
    expect(screen.getByText("Paid in full")).toBeInTheDocument();
    rerender(
      <CreditCardTile
        card={withInvoice({ reconciledAt: "2026-09-06T00:00:00.000Z" })}
        language="en"
        precision={2}
      />,
    );
    expect(screen.queryByText("Rounding mismatch - import statement")).not.toBeInTheDocument();
  });
});
