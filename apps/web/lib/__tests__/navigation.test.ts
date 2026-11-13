import { describe, expect, it } from "vitest";

import { isNavItemActive, mainNav } from "../navigation";

describe("isNavItemActive", () => {
  it("matches the section page and every page nested under it", () => {
    expect(isNavItemActive("/accounts", "/accounts")).toBe(true);
    expect(isNavItemActive("/accounts/0f5c", "/accounts")).toBe(true);
    expect(isNavItemActive("/credit-cards/1/invoices/2", "/credit-cards")).toBe(true);
    expect(isNavItemActive("/investments/accounts/9", "/investments")).toBe(true);
  });

  it("does not match a sibling that only shares a prefix", () => {
    expect(isNavItemActive("/accountsettings", "/accounts")).toBe(false);
    expect(isNavItemActive("/investments/accounts", "/accounts")).toBe(false);
    expect(isNavItemActive(null, "/accounts")).toBe(false);
  });

  it("highlights exactly one main item on a detail route", () => {
    for (const path of [
      "/accounts/1",
      "/budgets/1",
      "/goals/2",
      "/bills/3",
      "/splits/4",
      "/credit-cards/5",
    ]) {
      expect(mainNav.filter((item) => isNavItemActive(path, item.href))).toHaveLength(1);
    }
  });
});
