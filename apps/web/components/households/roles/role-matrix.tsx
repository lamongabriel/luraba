import { HOUSEHOLD_ROLE_METADATA, type HouseholdRole } from "@luraba/contracts";
import { PERMISSION_GROUPS } from "@/lib/permission-catalog";
import { ActionChips } from "./role-permissions";

const ROLES: readonly HouseholdRole[] = ["owner", "admin", "member", "viewer"];

/** All roles side by side: one row per area, one column per role. */
export function RoleMatrix() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-xs">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="w-44 pb-2 pr-3 font-medium">Area</th>
            {ROLES.map((role) => (
              <th key={role} className="pb-2 pr-3 font-medium">
                {HOUSEHOLD_ROLE_METADATA[role].label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERMISSION_GROUPS.map((group) => (
            <tr key={group.key} className="border-t border-border/60 align-top">
              <th scope="row" className="py-2 pr-3 text-left font-medium">
                {group.label}
              </th>
              {ROLES.map((role) => (
                <td key={role} className="py-2 pr-3">
                  <ActionChips role={role} group={group} size="sm" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
