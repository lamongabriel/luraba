import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ChartCard } from "../chart-card";
import {
  formatChartAxisMoney,
  formatChartDate,
  formatChartDateLabel,
  formatChartMoney,
} from "../chart-format";
import { paletteColor } from "../chart-theme";
import { DonutChartCard } from "../donut-chart-card";
import { GaugeChartCard } from "../gauge-chart-card";
import { ProgressRing } from "../progress-ring";

describe("chart formatting", () => {
  it("formats money from minor units with the currency", () => {
    expect(formatChartMoney(123_456, { currencyCode: "USD" })).toBe("$1,234.56");
    expect(formatChartAxisMoney(1_500_000, { currencyCode: "USD" })).toBe("15K");
  });

  it("labels buckets by their size", () => {
    expect(formatChartDate("2026-03-05")).toBe("Mar 5");
    expect(formatChartDate("2026-03-01", "month")).toBe("Mar 2026");
    expect(formatChartDateLabel("2026-03-02", "week")).toMatch(/^Week of /);
  });

  it("cycles the palette", () => {
    expect(paletteColor(0)).toBe(paletteColor(5));
  });
});

describe("ChartCard", () => {
  it("shows a skeleton while loading", () => {
    render(
      <ChartCard title="Balance history" status="loading">
        <p>plot</p>
      </ChartCard>,
    );
    expect(screen.getByRole("status", { name: "Loading Balance history" })).toBeInTheDocument();
    expect(screen.queryByText("plot")).not.toBeInTheDocument();
  });

  it("shows a retryable error", async () => {
    const onRetry = vi.fn();
    render(
      <ChartCard title="Cash flow" status="error" errorMessage="Server down" onRetry={onRetry}>
        <p>plot</p>
      </ChartCard>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Server down");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("shows the empty state, then the chart", () => {
    const { rerender } = render(
      <ChartCard title="Cash flow" isEmpty emptyTitle="No cash flow">
        <p>plot</p>
      </ChartCard>,
    );
    expect(screen.getByText("No cash flow")).toBeInTheDocument();
    rerender(
      <ChartCard title="Cash flow">
        <p>plot</p>
      </ChartCard>,
    );
    expect(screen.getByText("plot")).toBeInTheDocument();
  });
});

describe("DonutChartCard", () => {
  it("lists every slice with its amount and share, and the total", () => {
    render(
      <DonutChartCard
        title="Expenses"
        currencyCode="USD"
        data={[
          { name: "Food", value: 7_500 },
          { name: "Rent", value: 2_500 },
        ]}
      />,
    );
    const legend = screen.getByRole("list", { name: "Expenses legend" });
    expect(legend).toHaveTextContent("Food");
    expect(legend).toHaveTextContent("$75.00");
    expect(legend).toHaveTextContent("75%");
    expect(screen.getByText("$100.00")).toBeInTheDocument();
  });

  it("is empty without positive slices", () => {
    render(
      <DonutChartCard title="Expenses" currencyCode="USD" data={[{ name: "Food", value: 0 }]} />,
    );
    expect(screen.getByText("Nothing to chart yet")).toBeInTheDocument();
  });
});

describe("gauge and ring", () => {
  it("fills the ring up to the percent and caps it", () => {
    const { container, rerender } = render(<ProgressRing percent={40} label="40% spent" />);
    expect(screen.getByRole("img", { name: "40% spent" })).toBeInTheDocument();
    expect(container.querySelectorAll("circle")[1]?.getAttribute("stroke-dasharray")).toBe(
      "40 100",
    );
    rerender(<ProgressRing percent={250} label="over" />);
    expect(container.querySelectorAll("circle")[1]?.getAttribute("stroke-dasharray")).toBe(
      "100 100",
    );
    rerender(<ProgressRing percent={0} label="none" />);
    expect(container.querySelectorAll("circle")).toHaveLength(1);
  });

  it("shows the gauge with its center, stats and loading state", () => {
    const { rerender } = render(
      <GaugeChartCard
        title="Monthly budget"
        percent={45}
        tone="positive"
        centerValue="$1,100"
        centerLabel="left of $2,000"
        gaugeLabel="45% of the monthly budget spent"
      >
        <p>12 days left</p>
      </GaugeChartCard>,
    );
    expect(
      screen.getByRole("img", { name: "45% of the monthly budget spent" }),
    ).toBeInTheDocument();
    expect(screen.getByText("$1,100")).toBeInTheDocument();
    expect(screen.getByText("12 days left")).toBeInTheDocument();

    rerender(
      <GaugeChartCard
        title="Monthly budget"
        status="loading"
        percent={0}
        centerValue="-"
        gaugeLabel="loading"
      />,
    );
    expect(screen.getByRole("status", { name: /loading monthly budget/i })).toBeInTheDocument();
  });
});
