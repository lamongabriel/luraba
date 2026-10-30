import type { Account } from "@luraba/contracts";
import { ACCOUNT_TYPES } from "@luraba/contracts";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  ACCOUNT_TYPE_DISPLAY,
  AccountDisplay,
  AmountDisplay,
  amountKindForTransactionType,
  CategoryDisplay,
  getAccountVisual,
  MerchantDisplay,
  ProductDisplay,
  TagDisplay,
  TRANSACTION_TYPE_DISPLAY,
  TransactionTypeDisplay,
} from "../index";

const account = (overrides: Partial<Account> = {}): Account =>
  ({
    id: crypto.randomUUID(),
    name: "Daily driver",
    type: "vehicle",
    institutionLogoUrl: "https://logo.example/x.png",
    imageUploadId: null,
    ...overrides,
  }) as Account;

describe("display catalogs", () => {
  it("covers every account type", () => {
    for (const type of ACCOUNT_TYPES) expect(ACCOUNT_TYPE_DISPLAY[type]).toBeDefined();
  });

  it("covers every transaction origin type", () => {
    for (const type of ["expense", "income", "transfer", "adjustment"] as const) {
      expect(TRANSACTION_TYPE_DISPLAY[type].label).toBeTruthy();
    }
  });

  it("maps transaction types to amount kinds", () => {
    expect(amountKindForTransactionType("expense")).toBe("expense");
    expect(amountKindForTransactionType("income")).toBe("income");
    expect(amountKindForTransactionType("transfer")).toBe("transfer");
  });
});

describe("AccountDisplay", () => {
  it("prefers an uploaded picture over the institution logo", () => {
    const visual = getAccountVisual(account({ imageUploadId: "up-1" }));
    expect(visual.imageUrl).toContain("up-1");
  });

  it("falls back to the institution logo, then the type icon", () => {
    expect(getAccountVisual(account()).imageUrl).toBe("https://logo.example/x.png");
    expect(getAccountVisual(account({ institutionLogoUrl: null })).imageUrl).toBeNull();
  });

  it("renders the name and a placeholder for no account", () => {
    const { rerender } = render(<AccountDisplay account={account()} detail="type" />);
    expect(screen.getByText("Daily driver")).toBeInTheDocument();
    expect(screen.getByText("Vehicle")).toBeInTheDocument();
    rerender(<AccountDisplay account={null} />);
    expect(screen.getByText("No account")).toBeInTheDocument();
  });
});

describe("AmountDisplay", () => {
  it("signs income and expense and leaves transfers neutral", () => {
    const { container, rerender } = render(
      <AmountDisplay amount={1000} currencyCode="USD" kind="income" />,
    );
    expect(container.textContent).toMatch(/^\+.*10\.00/);
    rerender(<AmountDisplay amount={1000} currencyCode="USD" kind="expense" />);
    expect(container.textContent).toMatch(/^-.*10\.00/);
    rerender(<AmountDisplay amount={1000} currencyCode="USD" kind="transfer" />);
    expect(container.textContent).not.toMatch(/^[+-]/);
  });

  it("derives the kind from the sign with kind=auto", () => {
    const { container } = render(<AmountDisplay amount={-500} currencyCode="USD" kind="auto" />);
    expect(container.textContent).toMatch(/^-.*5\.00/);
  });
});

describe("other displays", () => {
  it("renders transaction type, merchant, category and tag", () => {
    render(
      <div>
        <TransactionTypeDisplay type="transfer" />
        <MerchantDisplay merchant={{ name: "Whole Foods", logoUrl: null, domain: null }} />
        <CategoryDisplay category={null} />
        <TagDisplay tag={{ name: "Trip", icon: "tag", color: "#00aa00" }} />
      </div>,
    );
    expect(screen.getByText("Transfer")).toBeInTheDocument();
    expect(screen.getByText("Whole Foods")).toBeInTheDocument();
    expect(screen.getByText("Uncategorized")).toBeInTheDocument();
    expect(screen.getByText("Trip")).toBeInTheDocument();
  });
});

describe("product display", () => {
  it("renders the name and detail, or the empty label", () => {
    render(
      <div>
        <ProductDisplay product={{ name: "Cheeseburger" }} detail="2 x $9.00" />
        <ProductDisplay product={null} />
      </div>,
    );
    expect(screen.getByText("Cheeseburger")).toBeInTheDocument();
    expect(screen.getByText("2 x $9.00")).toBeInTheDocument();
    expect(screen.getByText("No product")).toBeInTheDocument();
  });
});
