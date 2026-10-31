"use client";

import type { HouseholdRole } from "@luraba/contracts";
import { summarizeRole } from "@/lib/permission-catalog";
import { cn } from "@/lib/utils";
import { RoleBadge } from "./role-badge";

/**
 * Pick a role: one compact row per role you are allowed to give, each with a one-line summary of
 * what it can do. The full list is on the Roles page.
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
                <span className="text-[0.68rem] text-muted-foreground">{summarizeRole(role)}</span>
              </span>
            </button>
          );
        })}
      </fieldset>
    </div>
  );
}
