"use client";

import type { GoalContribution } from "@luraba/contracts";
import { todayISODate } from "@luraba/domain";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput, MoneyInput } from "@/components/ui/masked-input";
import { Modal, ModalBody, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Typography } from "@/components/ui/typography";
import { majorToMinorUnits, minorToMajorUnits } from "@/lib/finance";
import {
  useAddContributionMutation,
  useUpdateContributionMutation,
} from "@/mutations/goals/use-goal-mutations";

/** Records money added to (or taken out of) a goal by hand, or edits an existing contribution. */
export function ContributionModal({
  open,
  onOpenChange,
  goalId,
  contribution,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: string;
  contribution?: GoalContribution;
}) {
  const [withdrawal, setWithdrawal] = React.useState(false);
  const [amount, setAmount] = React.useState("");
  const [contributedOn, setContributedOn] = React.useState("");
  const [note, setNote] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setWithdrawal(Boolean(contribution && contribution.amount < 0));
    setAmount(contribution ? String(minorToMajorUnits(Math.abs(contribution.amount), 2)) : "");
    setContributedOn(contribution?.contributedOn ?? todayISODate());
    setNote(contribution?.note ?? "");
  }, [open, contribution]);

  const close = () => onOpenChange(false);
  const add = useAddContributionMutation({ onSuccess: close, successToast: { title: "Saved" } });
  const update = useUpdateContributionMutation({
    onSuccess: close,
    successToast: { title: "Contribution updated" },
  });
  const pending = add.isPending || update.isPending;
  const errorMessage = add.errorMessage || update.errorMessage;
  const value = Number(amount);
  const valid = Number.isFinite(value) && value > 0 && Boolean(contributedOn);

  const submit = () => {
    if (!valid) return;
    const minor = majorToMinorUnits(value, 2) * (withdrawal ? -1 : 1);
    const body = { amount: minor, contributedOn, note: note.trim() || null };
    if (contribution) {
      update.mutate({ target: { id: goalId, contributionId: contribution.id }, body });
    } else {
      add.mutate({ id: goalId, body });
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        title={contribution ? "Edit contribution" : "Add to this goal"}
        description={
          contribution?.transaction
            ? "This contribution is linked to a transaction."
            : "Record money you put toward the goal, or took back out."
        }
        isLoading={pending}
        size="sm"
      >
        <ModalBody className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={withdrawal ? "outline" : "default"}
              onClick={() => setWithdrawal(false)}
            >
              Add
            </Button>
            <Button
              type="button"
              variant={withdrawal ? "default" : "outline"}
              onClick={() => setWithdrawal(true)}
            >
              Withdraw
            </Button>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contribution-amount">Amount</Label>
            <MoneyInput id="contribution-amount" value={amount} onValueChange={setAmount} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contribution-date">Date</Label>
            <DateInput
              id="contribution-date"
              value={contributedOn}
              onValueChange={setContributedOn}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contribution-note">Note</Label>
            <Input
              id="contribution-note"
              value={note}
              maxLength={500}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
          {errorMessage ? (
            <Typography variant="small-destructive">{errorMessage}</Typography>
          ) : null}
        </ModalBody>
        <ModalFooter
          cancelLabel="Cancel"
          confirmLabel="Save"
          confirmDisabled={!valid}
          isLoading={pending}
          loadingLabel="Saving..."
          onConfirm={submit}
        />
      </ModalContent>
    </Modal>
  );
}
