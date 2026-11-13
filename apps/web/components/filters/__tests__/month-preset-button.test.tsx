import { describe, expect, it } from "vitest";

import { monthPickList } from "../month-preset-button";

describe("monthPickList", () => {
  it("lists the months newest first, a few ahead and a year and a half back", () => {
    const list = monthPickList("2026-11");
    expect(list[0]).toBe("2027-02");
    expect(list).toContain("2026-11");
    expect(list.at(-1)).toBe("2025-05");
    expect(new Set(list).size).toBe(list.length);
  });
});
