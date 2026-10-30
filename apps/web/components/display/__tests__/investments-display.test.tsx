import type { InvestmentAccount } from "@luraba/contracts";
import { ASSET_CLASSES, INVESTMENT_EVENT_TYPES } from "@luraba/contracts";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  ACCOUNT_TYPE_DISPLAY,
  AccountDisplay,
  ASSET_CLASS_DISPLAY,
  AssetDisplay,
  getAccountLabels,
  getAccountVisual,
  INVESTMENT_EVENT_TYPE_DISPLAY,
  InvestmentEventTypeDisplay,
} from "../index";

const investmentAccount = (overrides: Partial<InvestmentAccount> = {}): InvestmentAccount =>
  ({
    id: crypto.randomUUID(),
    name: "Schwab brokerage",
    imageUploadId: null,
    institutionLogoUrl: null,
    broker: "Charles Schwab",
    ...overrides,
  }) as InvestmentAccount;

describe("investment display catalogs", () => {
  it("covers every asset class and transaction type", () => {
    for (const assetClass of ASSET_CLASSES) {
      expect(ASSET_CLASS_DISPLAY[assetClass].label).toBeTruthy();
    }
    for (const type of INVESTMENT_EVENT_TYPES) {
      expect(INVESTMENT_EVENT_TYPE_DISPLAY[type].label).toBeTruthy();
    }
  });
});

describe("AssetDisplay", () => {
  it("shows the symbol and the name", () => {
    render(<AssetDisplay asset={{ symbol: "AAPL", name: "Apple Inc.", assetClass: "STOCK" }} />);
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("Apple Inc.")).toBeInTheDocument();
  });

  it("can show the class instead of the name, and an empty label", () => {
    const { rerender } = render(
      <AssetDisplay
        asset={{ symbol: "VOO", name: "Vanguard S&P 500", assetClass: "ETF" }}
        detail="class"
      />,
    );
    expect(screen.getByText("ETF")).toBeInTheDocument();
    rerender(<AssetDisplay asset={null} />);
    expect(screen.getByText("No asset")).toBeInTheDocument();
  });
});

describe("InvestmentEventTypeDisplay", () => {
  it("labels the type in every variant", () => {
    const { rerender } = render(<InvestmentEventTypeDisplay type="BUY" />);
    expect(screen.getByText("Buy")).toBeInTheDocument();
    rerender(<InvestmentEventTypeDisplay type="JCP" variant="inline" />);
    expect(screen.getByText("Interest on equity (JCP)")).toBeInTheDocument();
    rerender(<InvestmentEventTypeDisplay type="SELL" variant="icon" />);
    expect(screen.getByText("Sell")).toHaveClass("sr-only");
  });
});

describe("AccountDisplay with an investment account", () => {
  it("uses the investment type icon and the broker as detail", () => {
    const account = investmentAccount();
    expect(getAccountVisual(account).color).toBe(ACCOUNT_TYPE_DISPLAY.investment.color);
    expect(getAccountLabels(account).detail).toBe("Charles Schwab");
    render(<AccountDisplay account={account} detail="type" />);
    expect(screen.getByText("Schwab brokerage")).toBeInTheDocument();
    expect(screen.getByText("Charles Schwab")).toBeInTheDocument();
  });
});
