"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function HouseholdDeleteDialog({
  householdName,
  open,
  onOpenChange,
  onConfirm,
  isPending = false,
}: {
  householdName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending?: boolean;
}) {
  const [confirmation, setConfirmation] = React.useState("");
  const matches = confirmation.trim() === householdName;

  React.useEffect(() => {
    if (!open) setConfirmation("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {householdName}?</DialogTitle>
          <DialogDescription>
            This permanently destroys the household, its accounts, transactions, cards, budgets,
            categories, tags, invitations, members, and settings. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="delete-household-confirmation">Type the household name to continue</Label>
          <Input
            id="delete-household-confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!matches}
            isLoading={isPending}
            loadingText="Deleting..."
            onClick={onConfirm}
          >
            Delete household
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
