import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { setMobileViewport } from "../../../test/viewport";

function Sample() {
  return (
    <Popover open>
      <PopoverTrigger>open</PopoverTrigger>
      <PopoverContent>hello</PopoverContent>
    </Popover>
  );
}

describe("overlays on mobile", () => {
  afterEach(() => {
    cleanup();
    setMobileViewport(false);
  });

  it("renders a popover as a bottom drawer below md", () => {
    setMobileViewport(true);
    render(<Sample />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toMatch(/bottom-0/);
  });

  it("keeps the desktop popover on desktop", () => {
    setMobileViewport(false);
    render(<Sample />);
    expect(screen.queryByRole("dialog")?.className ?? "").not.toMatch(/bottom-0/);
  });
});
