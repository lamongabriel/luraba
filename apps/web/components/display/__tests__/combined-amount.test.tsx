import type { CombinedFx } from "@luraba/contracts";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CombinedAmountDisplay, combinedNote } from "../index";

const fx: CombinedFx = {
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
      source: "frankfurter",
    },
  ],
  missingCurrencies: [],
};

const mixed = {
  total: 110_000,
  byCurrency: [
    { currencyCode: "BRL", amount: 50_000 },
    { currencyCode: "USD", amount: 100_000 },
  ],
};

describe("CombinedAmountDisplay", () => {
  it("shows ONE number in the base currency and the per-currency amounts behind it", () => {
    render(<CombinedAmountDisplay combined={mixed} fx={fx} />);
    expect(screen.getByText("$1,100.00")).toBeTruthy();
    expect(screen.queryByText("R$500.00")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /how this total was converted/i }));
    expect(screen.getByText(/Added up in USD/)).toBeTruthy();
    expect(screen.getByText("R$500.00")).toBeTruthy();
    expect(screen.getByText(/1 BRL = 0\.2 USD/)).toBeTruthy();
    expect(screen.getByText(/market rate/)).toBeTruthy();
  });

  it("is a plain amount (no popover) when everything is in the base currency", () => {
    render(
      <CombinedAmountDisplay
        combined={{ total: 5_000, byCurrency: [{ currencyCode: "USD", amount: 5_000 }] }}
        fx={{ ...fx, rates: [], asOf: null }}
      />,
    );
    expect(screen.getByText("$50.00")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("never guesses when a rate is missing: each currency is shown on its own", () => {
    const missing: CombinedFx = { ...fx, rates: [], asOf: null, missingCurrencies: ["BRL"] };
    const combined = { total: null, byCurrency: mixed.byCurrency };
    render(<CombinedAmountDisplay combined={combined} fx={missing} />);
    expect(screen.getByText("R$500.00")).toBeTruthy();
    expect(screen.getByText("$1,000.00")).toBeTruthy();
    expect(screen.queryByText("$1,100.00")).toBeNull();
    expect(combinedNote(combined, missing)).toBe("Rate unavailable for BRL");
  });
});

describe("combinedNote", () => {
  it("says when the figure was converted, and nothing when it was not", () => {
    expect(combinedNote(mixed, fx)).toBe("≈ converted at 12 Nov 2026");
    expect(
      combinedNote({ total: 1, byCurrency: [{ currencyCode: "USD", amount: 1 }] }, fx),
    ).toBeNull();
  });
});
