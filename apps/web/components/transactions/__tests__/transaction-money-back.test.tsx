import { REFUND_REASONS, type Transaction } from "@luraba/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { REFUND_REASON_LABELS, RefundReasonDisplay } from "@/components/display";
import type { TransactionLookups } from "@/queries/transactions/use-transaction-lookups-query";

const getTransaction = vi.fn();
vi.mock("@/services/transactions.service", () => ({
  getTransaction: (id: string) => getTransaction(id),
  listTransactions: vi.fn(),
  linkRefund: vi.fn(),
}));

const { TransactionNetCost } = await import("../transaction-money-back");

const lookups = { accounts: [], creditCards: [] } as unknown as TransactionLookups;
const PURCHASE = "00000000-0000-4000-8000-000000000001";

const purchase = (moneyBack: Transaction["moneyBack"]) =>
  ({
    id: PURCHASE,
    type: "expense",
    description: "Lanchonight",
    currencyCode: "BRL",
    amount: 27000,
    moneyBack,
  }) as Transaction;

function renderBlock() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<TransactionNetCost lookups={lookups} precision={2} transactionId={PURCHASE} />, {
    wrapper,
  });
}

describe("money-back reasons", () => {
  it("labels every reason, including split", () => {
    for (const reason of REFUND_REASONS) expect(REFUND_REASON_LABELS[reason]).toBeTruthy();
    render(<RefundReasonDisplay reason="split" />);
    expect(screen.getByText("Split")).toBeInTheDocument();
  });
});

describe("TransactionNetCost", () => {
  beforeEach(() => {
    getTransaction.mockReset();
  });

  it("shows total paid, each received row, the total and what is out of pocket", async () => {
    getTransaction.mockResolvedValue(
      purchase({
        totalAmount: 27000,
        receivedBack: 8200,
        outOfPocket: 18800,
        entries: [
          {
            transactionId: "00000000-0000-4000-8000-000000000002",
            reason: "split",
            description: "Split: Mario",
            amount: 8200,
            currencyCode: "BRL",
            postedDate: "2026-11-07",
            accountId: null,
            accountName: "Inter",
            accountClassification: "asset",
            creditCardId: null,
          },
        ],
      }),
    );
    renderBlock();
    expect(await screen.findByText("Total paid")).toBeInTheDocument();
    expect(screen.getByText("Received back")).toBeInTheDocument();
    expect(screen.getByText(/Split: Mario/)).toBeInTheDocument();
    expect(screen.getByText("Inter")).toBeInTheDocument();
    expect(screen.getByText("Total received back")).toBeInTheDocument();
    expect(screen.getByText("Out of my pocket")).toBeInTheDocument();
    expect(screen.getByText(/188[.,]00/)).toBeInTheDocument();
  });

  it("renders nothing when no money back is linked", async () => {
    getTransaction.mockResolvedValue(
      purchase({ totalAmount: 27000, receivedBack: 0, outOfPocket: 27000, entries: [] }),
    );
    const { container } = renderBlock();
    await waitFor(() => expect(getTransaction).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("shows a skeleton with the same rows while it loads", () => {
    getTransaction.mockImplementation(() => new Promise(() => undefined));
    const { container } = renderBlock();
    expect(screen.getByText("Net cost")).toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(8);
  });

  it("shows a retryable error when the detail fails to load", async () => {
    getTransaction.mockImplementation(() => Promise.reject(new Error("boom")));
    renderBlock();
    expect(await screen.findByText("Couldn’t load the net cost")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry|try again/i })).toBeInTheDocument();
  });
});
