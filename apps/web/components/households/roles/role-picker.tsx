"use client";

import { HOUSEHOLD_ROLE_METADATA, type HouseholdRole } from "@luraba/contracts";
import { countRolePermissions, TOTAL_PERMISSIONS } from "@/lib/permission-catalog";
import { cn } from "@/lib/utils";
import { RoleBadge } from "./role-badge";
import { RolePermissions } from "./role-permissions";

/**
 * Pick a role by reading what it means: one card per role you are allowed to give, and below them
 * the full list of what the chosen role can do. Replaces a bare "Admin / Member / Viewer" select.
 */
export function RolePicker({
  roles,
  value,
  onChange,
  disabled = false,
}: {
  roles: readonly HouseholdRole[];
  value: HouseholdRole;
  onChange: (role: HouseholdRole) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-4">
      <fieldset aria-label="Role" className="grid gap-2 border-0 p-0">
        {roles.map((role) => {
          const selected = role === value;
          return (
            <button
              key={role}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onChange(role)}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 disabled:opacity-60",
                selected ? "border-primary bg-muted/60 ring-1 ring-primary/40" : "border-border",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <RoleBadge role={role} />
                <span className="text-[0.68rem] text-muted-foreground">
                  {countRolePermissions(role)} of {TOTAL_PERMISSIONS} permissions
                </span>
              </span>
              <span className="mt-1.5 block text-xs text-muted-foreground">
                {HOUSEHOLD_ROLE_METADATA[role].description}
              </span>
            </button>
          );
        })}
      </fieldset>
      <div className="rounded-lg border border-dashed border-border p-3">
        <p className="mb-2 text-xs font-medium">
          What {HOUSEHOLD_ROLE_METADATA[value].label.toLowerCase()}s can do
        </p>
        <RolePermissions role={value} />
      </div>
    </div>
  );
}
