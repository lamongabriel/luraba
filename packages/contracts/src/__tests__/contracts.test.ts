import { describe, expect, it } from "vitest";
import { HOUSEHOLD_PERMISSIONS, householdInviteStatusSchema, householdRoleSchema } from "../index";

describe("shared contracts", () => {
  it("validates stable household roles and invite statuses", () => {
    expect(householdRoleSchema.parse("owner")).toBe("owner");
    expect(householdInviteStatusSchema.parse("pending")).toBe("pending");
    expect(householdRoleSchema.safeParse("superuser").success).toBe(false);
  });

  it("keeps permission keys unique", () => {
    expect(new Set(HOUSEHOLD_PERMISSIONS).size).toBe(HOUSEHOLD_PERMISSIONS.length);
  });
});
