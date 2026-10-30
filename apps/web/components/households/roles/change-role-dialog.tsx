"use client";

import { HOUSEHOLD_ROLE_METADATA, type HouseholdRole } from "@luraba/contracts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { describePermission, diffRoles } from "@/lib/permission-catalog";
import { RoleBadge } from "./role-badge";

function ChangeList({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className={`text-xs font-medium ${tone}`}>
        {title} ({items.length})
      </p>
      <ul className="max-h-40 list-disc space-y-0.5 overflow-y-auto pl-5 text-xs text-muted-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/** Confirms a role change by spelling out what the person gains and loses. */
export function ChangeRoleDialog({
  open,
  onOpenChange,
  name,
  from,
  to,
  isPending = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  from: HouseholdRole;
  to: HouseholdRole;
  isPending?: boolean;
  onConfirm: () => void;
}) {
  const { gained, lost } = diffRoles(from, to);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change {name}'s role?</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-1.5">
            <RoleBadge role={from} /> to <RoleBadge role={to} />
            <span className="basis-full">{HOUSEHOLD_ROLE_METADATA[to].description}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <ChangeList
            title="Will be able to"
            items={gained.map(describePermission)}
            tone="text-emerald-600"
          />
          <ChangeList
            title="Will no longer be able to"
            items={lost.map(describePermission)}
            tone="text-destructive"
          />
          {gained.length === 0 && lost.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nothing changes.</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={onConfirm} isLoading={isPending}>
            Change role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
