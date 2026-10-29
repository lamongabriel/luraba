"use client";

import type { CreditCard } from "@luraba/contracts";
import { formatISODate, getTodayInTimezone } from "@luraba/domain";
import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { Label } from "@/components/ui/label";
import { DateInput, MoneyInput } from "@/components/ui/masked-input";
import { Modal, ModalBody, ModalContent, ModalFooter } from "@/components/ui/modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Typography } from "@/components/ui/typography";
import { majorToMinorUnits, minorToMajorUnits } from "@/lib/finance";
import { useCreateCreditCardPaymentMutation } from "@/mutations/credit-cards/use-credit-card-transaction-mutations";
import { accountQueryKeys } from "@/queries/accounts/use-accounts-query";
import { creditCardQueryKeys } from "@/queries/credit-cards/use-credit-cards-query";
import { useTransactionLookupsQuery } from "@/queries/transactions/use-transaction-lookups-query";
import { transactionQueryKeys } from "@/queries/transactions/use-transactions-query";
import { useAuthSessionStore } from "@/stores/auth-session-store";

/**
 * Pays toward a card's invoices. The API applies a payment to the oldest unpaid invoices first,
 * so the suggested amount covers everything unpaid up to the selected invoice.
 */
export function PayInvoiceModal({
  open,
  onOpenChange,
  card,
  suggestedAmount,
  precision,
  coversOlderInvoices,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: CreditCard;
  /** Minor units. */
  suggestedAmount: number;
  precision: number;
  coversOlderInvoices: boolean;
}) {
  const timezone = useAuthSessionStore((state) => state.user?.preferences.timezone ?? "UTC");
  const queryClient = useQueryClient();
  const lookups = useTransactionLookupsQuery();
  const sources = (lookups.data?.accounts ?? []).filter(
    (account) =>
      account.classification === "asset" &&
      account.type !== "credit_card" &&
      account.currencyCode === card.currencyCode,
  );
  const [fromAccountId, setFromAccountId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [paymentDate, setPaymentDate] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setAmount(String(minorToMajorUnits(suggestedAmount, precision)));
    setPaymentDate(formatISODate(getTodayInTimezone(timezone)));
    setFromAccountId((current) => current || card.ownerAccountId);
  }, [open, suggestedAmount, precision, timezone, card.ownerAccountId]);

  const pay = useCreateCreditCardPaymentMutation({
    successToast: { title: "Payment recorded" },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: creditCardQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: transactionQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: accountQueryKeys.all }),
      ]);
      onOpenChange(false);
    },
  });
  const value = Number(amount);
  const valid =
    Number.isFinite(value) && value > 0 && Boolean(fromAccountId) && Boolean(paymentDate);

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        title="Pay invoice"
        description={`Pay ${card.name} from one of your accounts.`}
        isLoading={pay.isPending}
        size="sm"
      >
        <ModalBody className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="pay-from">Pay from</Label>
            <Select value={fromAccountId} onValueChange={setFromAccountId}>
              <SelectTrigger id="pay-from">
                <SelectValue placeholder="Choose an account" />
              </SelectTrigger>
              <SelectContent>
                {sources.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pay-amount">Amount</Label>
            <MoneyInput id="pay-amount" value={amount} onValueChange={setAmount} />
            {coversOlderInvoices ? (
              <Typography variant="small-muted">
                Includes older unpaid invoices, which are paid first.
              </Typography>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pay-date">Date</Label>
            <DateInput id="pay-date" value={paymentDate} onValueChange={setPaymentDate} />
          </div>
          {pay.errorMessage ? (
            <Typography variant="small-destructive">{pay.errorMessage}</Typography>
          ) : null}
        </ModalBody>
        <ModalFooter
          cancelLabel="Cancel"
          confirmLabel="Pay"
          confirmDisabled={!valid}
          isLoading={pay.isPending}
          onConfirm={() =>
            pay.mutate({
              creditCardId: card.id,
              body: {
                amount: majorToMinorUnits(value, precision),
                fromAccountId,
                paymentDate,
              },
            })
          }
        />
      </ModalContent>
    </Modal>
  );
}
