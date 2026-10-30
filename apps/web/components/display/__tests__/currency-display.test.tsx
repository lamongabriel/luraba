import { resolveCurrency } from "@luraba/contracts";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CurrencyLabel, StaticCurrencyDisplay } from "../index";

describe("CurrencyDisplay", () => {
  it("shows the flag, code and symbol", () => {
    const { container } = render(<StaticCurrencyDisplay currencyCode="BRL" />);
    expect(container.textContent).toBe("🇧🇷BRLR$");
    expect(container.querySelector("[data-currency='BRL']")).not.toBeNull();
  });

  it("shows $ for USD and optionally the name", () => {
    const { container } = render(<CurrencyLabel currency={resolveCurrency("USD")} showName />);
    expect(container.textContent).toBe("🇺🇸USD$US Dollar");
  });

  it("renders an unknown code without a flag or duplicate symbol", () => {
    const { container } = render(<StaticCurrencyDisplay currencyCode="XYZ" />);
    expect(container.textContent).toBe("XYZ");
  });
});
