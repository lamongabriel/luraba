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
