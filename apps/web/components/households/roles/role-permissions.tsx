import type { HouseholdRole } from "@luraba/contracts";
import {
  describePermission,
  getPermissionAction,
  PERMISSION_ACTION_LABELS,
  PERMISSION_GROUPS,
  type PermissionGroup,
  roleHasPermission,
} from "@/lib/permission-catalog";
import { cn } from "@/lib/utils";

/** The actions a group offers, lit when `role` has them; hover for the plain-words meaning. */
export function ActionChips({
  role,
  group,
  size = "md",
}: {
  role: HouseholdRole;
  group: PermissionGroup;
  size?: "sm" | "md";
}) {
  return (
    <span className="flex flex-wrap gap-1">
      {group.permissions.map((permission) => {
        const allowed = roleHasPermission(role, permission);
        const label = PERMISSION_ACTION_LABELS[getPermissionAction(permission)];
        return (
          <span
            key={permission}
            title={`${allowed ? "Can" : "Cannot"}: ${describePermission(permission)}`}
            className={cn(
              "rounded-md border px-1.5 py-0.5 leading-none",
              size === "sm" ? "text-[0.6rem]" : "text-[0.68rem]",
              allowed
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-transparent bg-muted/60 text-muted-foreground/60 line-through",
            )}
          >
            <span className="sr-only">{allowed ? "Can " : "Cannot "}</span>
            {label}
          </span>
        );
      })}
    </span>
  );
}

/**
 * Everything a role can and cannot do, one row per area. Used to preview a role before giving it
 * (invitations, role changes) and on the roles page.
 */
export function RolePermissions({
  role,
  hideEmpty = false,
  className,
}: {
  role: HouseholdRole;
  /** Leave out areas where the role has nothing. */
  hideEmpty?: boolean;
  className?: string;
}) {
  const groups = hideEmpty
    ? PERMISSION_GROUPS.filter((group) => group.permissions.some((p) => roleHasPermission(role, p)))
    : PERMISSION_GROUPS;
  return (
    <ul className={cn("divide-y divide-border/60", className)}>
      {groups.map((group) => (
        <li
          key={group.key}
          className="flex flex-col gap-1.5 py-2 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="text-xs font-medium">{group.label}</p>
            <p className="text-[0.68rem] text-muted-foreground">{group.description}</p>
          </div>
          <ActionChips role={role} group={group} />
        </li>
      ))}
    </ul>
  );
}
