import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Stepper } from "@/components/ui/stepper";

const steps = [
  { id: "a", label: "Upload" },
  { id: "b", label: "Columns", disabled: true },
  { id: "c", label: "Values" },
  { id: "d", label: "Review" },
];

describe("Stepper", () => {
  it("marks the current step and lets only finished steps be selected", async () => {
    const onSelect = vi.fn();
    render(<Stepper steps={steps} current={2} onSelect={onSelect} />);

    expect(screen.getByRole("list", { name: "Progress" })).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(items[2]).toHaveAttribute("aria-current", "step");

    // Step 1 is finished: a button. The disabled step and the future step are not.
    expect(screen.getAllByRole("button")).toHaveLength(1);
    await userEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith(0);
  });

  it("has no buttons without onSelect", () => {
    render(<Stepper steps={steps} current={3} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
