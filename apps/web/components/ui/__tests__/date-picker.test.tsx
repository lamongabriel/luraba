import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DatePicker } from "@/components/ui/date-picker";
import { calendarDateToIso, isoToCalendarDate } from "@/lib/calendar-date";

describe("calendar date helpers", () => {
  it("round-trips a plain date string", () => {
    expect(calendarDateToIso(isoToCalendarDate("2026-11-01") as Date)).toBe("2026-11-01");
  });

  it("rejects dates that do not exist", () => {
    expect(isoToCalendarDate("2026-02-31")).toBeUndefined();
    expect(isoToCalendarDate("")).toBeUndefined();
  });
});

describe("DatePicker", () => {
  it("shows the chosen day and emits YYYY-MM-DD from the calendar", async () => {
    const onValueChange = vi.fn();
    render(
      <DatePicker aria-label="Posted date" value="2026-11-01" onValueChange={onValueChange} />,
    );

    const trigger = screen.getByRole("button", { name: "Posted date" });
    expect(trigger).toHaveTextContent("01 Nov 2026");

    await userEvent.click(trigger);
    await userEvent.click(await screen.findByRole("button", { name: /November 15th, 2026/ }));
    expect(onValueChange).toHaveBeenCalledWith("2026-11-15");
  });

  it("shows the placeholder when empty", () => {
    render(<DatePicker aria-label="Due" value="" onValueChange={() => undefined} />);
    expect(screen.getByRole("button", { name: "Due" })).toHaveTextContent("Pick a date");
  });
});
