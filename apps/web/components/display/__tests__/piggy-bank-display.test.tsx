import { PIGGY_BANK_COVER_PRESETS } from "@luraba/contracts";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PIGGY_BANK_COVER_DISPLAY, PiggyBankDisplay } from "../index";

describe("PiggyBankDisplay", () => {
  it("has a look for every cover preset", () => {
    for (const preset of PIGGY_BANK_COVER_PRESETS) {
      expect(PIGGY_BANK_COVER_DISPLAY[preset].label).toBeTruthy();
    }
  });

  it("shows the title, the emoji and a detail", () => {
    render(
      <PiggyBankDisplay piggyBank={{ title: "Emergency fund", emoji: "🛟" }} detail="102% CDI" />,
    );
    expect(screen.getByText("Emergency fund")).toBeTruthy();
    expect(screen.getByText("🛟")).toBeTruthy();
    expect(screen.getByText("102% CDI")).toBeTruthy();
  });

  it("falls back to a label when there is no piggy bank", () => {
    render(<PiggyBankDisplay piggyBank={null} />);
    expect(screen.getByText("No piggy bank")).toBeTruthy();
  });
});
