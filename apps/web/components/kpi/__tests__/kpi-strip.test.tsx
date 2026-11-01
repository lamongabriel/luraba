import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { KpiStrip, KpiStripSkeleton } from "../kpi-strip";

describe("KpiStrip", () => {
  it("renders each figure as a term with its value and hint, without cards", () => {
    render(
      <KpiStrip
        items={[
          { label: "Net change", value: "$10", hint: "vs previous" },
          { label: "Total spent", value: "$4" },
          { label: "Upcoming", value: "$0" },
        ]}
      />,
    );
    expect(screen.getByText("Net change")).toBeInTheDocument();
    expect(screen.getByText("vs previous")).toBeInTheDocument();
    expect(screen.getByLabelText("Key figures")).toBeInTheDocument();
  });

  it("has a loading twin with the same number of cells", () => {
    const { container } = render(<KpiStripSkeleton count={5} />);
    expect(container.querySelectorAll("[role=status] > div")).toHaveLength(5);
  });
});
