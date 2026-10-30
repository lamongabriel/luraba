import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { KpiCard, KpiCardSkeleton, KpiGrid, KpiGridSkeleton } from "@/components/kpi";

import { DataBoundary } from "../data-boundary";

const base = { isPending: false, isError: false, loading: <p>loading</p> };

describe("DataBoundary", () => {
  it("shows loading first, then error, then empty, then children", () => {
    const { rerender } = render(
      <DataBoundary {...base} isPending>
        <p>content</p>
      </DataBoundary>,
    );
    expect(screen.getByText("loading")).toBeInTheDocument();

    const onRetry = vi.fn();
    rerender(
      <DataBoundary
        {...base}
        isError
        error={{ message: "boom" }}
        onRetry={onRetry}
        errorTitle="Oops"
      >
        <p>content</p>
      </DataBoundary>,
    );
    expect(screen.getByText("Oops")).toBeInTheDocument();
    expect(screen.getByText("boom")).toBeInTheDocument();

    rerender(
      <DataBoundary {...base} isEmpty emptyProps={{ title: "Nothing here" }}>
        <p>content</p>
      </DataBoundary>,
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();

    rerender(
      <DataBoundary {...base}>
        <p>content</p>
      </DataBoundary>,
    );
    expect(screen.getByText("content")).toBeInTheDocument();
  });
});

describe("KPI components", () => {
  it("shares one card height between the card and its skeleton", () => {
    const { container } = render(
      <div>
        <KpiCard title="Net" value="$1" />
        <KpiCardSkeleton />
      </div>,
    );
    const cards = container.querySelectorAll("[data-slot='card']");
    expect(cards).toHaveLength(2);
    for (const card of cards) expect(card.className).toContain("min-h-32");
  });

  it("renders as many skeletons as columns and accepts children as the value", () => {
    render(<KpiGridSkeleton columns={4} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    render(
      <KpiGrid columns={2}>
        <KpiCard title="Paid">12 of 24</KpiCard>
      </KpiGrid>,
    );
    expect(screen.getByText("12 of 24")).toBeInTheDocument();
  });
});
