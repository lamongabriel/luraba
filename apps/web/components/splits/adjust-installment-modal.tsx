"use client";

import type { SplitInstallment } from "@luraba/contracts";
import * as React from "react";
import { Label } from "@/components/ui/label";
import { DateInput, MoneyInput } from "@/components/ui/masked-input";
import { Modal, ModalBody, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Typography } from "@/components/ui/typography";
import { majorToMinorUnits, minorToMajorUnits } from "@/lib/finance";
import { useUpdateInstallmentMutation } from "@/mutations/splits/use-split-mutations";

export function AdjustInstallmentModal({
  installment,
  splitId,
  onClose,
}: {
  installment?: SplitInstallment;
  splitId: string;
  onClose: () => void;
}) {
  const [dueDate, setDueDate] = React.useState("");
  const [graceUntil, setGraceUntil] = React.useState("");
  const [amount, setAmount] = React.useState("");

  React.useEffect(() => {
    if (!installment) return;
    setDueDate(installment.dueDate);
    setGraceUntil(installment.graceUntil ?? "");
    setAmount(String(minorToMajorUnits(installment.expectedAmount, 2)));
  }, [installment]);

  const mutation = useUpdateInstallmentMutation({
    onSuccess: onClose,
    successToast: { title: "Installment updated" },
  });

  return (
    <Modal open={Boolean(installment)} onOpenChange={(open) => !open && onClose()}>
      <ModalContent
        title="Adjust installment"
        description="Change the date or amount, or give them extra time before it counts as overdue."
        isLoading={mutation.isPending}
        size="sm"
      >
        <ModalBody className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="adjust-due">Due date</Label>
            <DateInput id="adjust-due" value={dueDate} onValueChange={setDueDate} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adjust-grace">Grace period until</Label>
            <DateInput id="adjust-grace" value={graceUntil} onValueChange={setGraceUntil} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adjust-amount">Amount</Label>
            <MoneyInput id="adjust-amount" value={amount} onValueChange={setAmount} />
          </div>
          {mutation.errorMessage ? (
            <Typography variant="small-destructive">{mutation.errorMessage}</Typography>
          ) : null}
        </ModalBody>
        <ModalFooter
          cancelLabel="Cancel"
          confirmLabel="Save"
          isLoading={mutation.isPending}
          loadingLabel="Saving..."
          onConfirm={() => {
            if (!installment) return;
            mutation.mutate({
              target: { id: splitId, installmentId: installment.id },
              body: {
                dueDate,
                graceUntil: graceUntil || null,
                expectedAmount: majorToMinorUnits(Number(amount), 2),
              },
            });
          }}
        />
      </ModalContent>
    </Modal>
  );
}
