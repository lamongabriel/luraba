import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { KpiCard } from "../kpi-card";

describe("KpiCard", () => {
  it("shows the secondary line apart from the value, never glued to it", () => {
    render(<KpiCard title="Spent" value="$350.00" secondary="of $300.00" />);
    const value = screen.getByText("$350.00");
    const secondary = screen.getByText("of $300.00");
    expect(value).not.toBe(secondary);
    expect(secondary).toHaveClass("mt-1", "text-muted-foreground");
  });

  it("stacks several children (an amount per currency) with a gap", () => {
    render(
      <KpiCard title="Due">
        <span>$10.00</span>
        <span>R$20,00</span>
      </KpiCard>,
    );
    expect(screen.getByText("$10.00").parentElement).toHaveClass("flex-col", "gap-1");
  });
});
