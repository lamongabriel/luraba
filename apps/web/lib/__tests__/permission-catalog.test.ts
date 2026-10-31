import { canAssignRole, canManageMember, getAssignableRoles, PERMISSIONS } from "@luraba/contracts";
import { describe, expect, it } from "vitest";
import {
  countRolePermissions,
  diffRoles,
  PERMISSION_GROUPS,
  roleHasPermission,
  summarizeRole,
  TOTAL_PERMISSIONS,
} from "../permission-catalog";

describe("permission catalog", () => {
  it("lists every permission exactly once", () => {
    const listed = PERMISSION_GROUPS.flatMap((group) => group.permissions);
    expect(new Set(listed).size).toBe(listed.length);
    expect(listed.length).toBe(Object.values(PERMISSIONS).length);
    expect(TOTAL_PERMISSIONS).toBe(listed.length);
  });

  it("gives owners everything and viewers less than members", () => {
    expect(countRolePermissions("owner")).toBe(TOTAL_PERMISSIONS);
    expect(countRolePermissions("viewer")).toBeLessThan(countRolePermissions("member"));
    expect(countRolePermissions("member")).toBeLessThan(countRolePermissions("admin"));
  });

  it("diffs two roles into gained and lost abilities", () => {
    const up = diffRoles("viewer", "admin");
    expect(up.lost).toHaveLength(0);
    expect(up.gained.length).toBeGreaterThan(0);
    const down = diffRoles("admin", "viewer");
    expect(down.gained).toHaveLength(0);
    expect(roleHasPermission("viewer", PERMISSIONS.TRANSACTIONS_DELETE)).toBe(false);
  });
});

describe("summarizeRole", () => {
  it("is a short line that grows with the role", () => {
    expect(summarizeRole("viewer")).toContain("changes nothing");
    expect(summarizeRole("owner")).toContain(`all ${PERMISSION_GROUPS.length} areas`);
    expect(summarizeRole("admin")).toContain("deletes in");
  });
});

describe("role rank rules", () => {
  it("only lets owners hand out owner and admin", () => {
    expect(getAssignableRoles("owner")).toContain("owner");
    expect(getAssignableRoles("admin")).toEqual(["member", "viewer"]);
    expect(getAssignableRoles("member")).toEqual([]);
    expect(canAssignRole("admin", "admin")).toBe(false);
  });

  it("never lets an admin manage an owner, another admin or themselves", () => {
    expect(canManageMember("admin", "owner")).toBe(false);
    expect(canManageMember("admin", "admin")).toBe(false);
    expect(canManageMember("admin", "member")).toBe(true);
    expect(canManageMember("admin", "viewer", { self: true })).toBe(false);
    expect(canManageMember("viewer", "viewer")).toBe(false);
    expect(canManageMember("owner", "owner")).toBe(true);
  });
});
