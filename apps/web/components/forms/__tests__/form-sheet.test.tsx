import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FormSheet } from "@/components/forms/form-sheet";

describe("FormSheet", () => {
  it("uses the shared side-panel shell for form drawers", () => {
    render(
      <FormSheet
        open
        onOpenChange={() => undefined}
        title="Create household"
        description="Add a workspace for shared finances."
      >
        <label htmlFor="household-name">Name</label>
        <input id="household-name" />
      </FormSheet>,
    );

    expect(screen.getByRole("dialog")).toHaveTextContent("Create household");
    expect(screen.getByText("Add a workspace for shared finances.")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });
});
