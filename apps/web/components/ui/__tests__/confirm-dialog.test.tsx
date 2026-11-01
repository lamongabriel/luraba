import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";

describe("ConfirmDialog", () => {
  it("asks for confirmation and calls onConfirm", async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        onOpenChange={() => undefined}
        title="Remove this file?"
        confirmLabel="Remove file"
        onConfirm={onConfirm}
      />,
    );

    screen.getByRole("button", { name: "Remove file" }).click();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });
});
