import { HOUSEHOLD_ROLE_METADATA, type HouseholdRole } from "@luraba/contracts";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ROLE_TONE: Record<HouseholdRole, string> = {
  owner: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  admin: "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400",
  member: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  viewer: "border-border bg-muted text-muted-foreground",
};

/** A role as a coloured label; the one way a role is shown as a badge. */
export function RoleBadge({ role, className }: { role: HouseholdRole; className?: string }) {
  return (
    <Badge variant="outline" className={cn(ROLE_TONE[role], className)}>
      {HOUSEHOLD_ROLE_METADATA[role].label}
    </Badge>
  );
}
