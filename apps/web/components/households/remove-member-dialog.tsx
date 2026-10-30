"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function RemoveMemberDialog({
  open,
  onOpenChange,
  name,
  isPending = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  isPending?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remove {name}?</DialogTitle>
          <DialogDescription>
            They lose access to this household right away. Everything they added stays. You can
            invite them again later.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} isLoading={isPending}>
            Remove member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
