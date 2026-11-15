"use client";

import type { GoalContribution } from "@luraba/contracts";
import { convertMinorUnitsWithRate, todayISODate } from "@luraba/domain";
import * as React from "react";
import { ConversionDisplay } from "@/components/display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput, MoneyInput, NumberInput } from "@/components/ui/masked-input";
import { Modal, ModalBody, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { majorToMinorUnits, minorToMajorUnits } from "@/lib/finance";
import {
  useAddContributionMutation,
  useUpdateContributionMutation,
} from "@/mutations/goals/use-goal-mutations";
import { useContributionQuoteQuery } from "@/queries/goals/use-goals-queries";

/** Records money added to (or taken out of) a goal by hand, or edits an existing contribution. */
export function ContributionModal({
  open,
  onOpenChange,
  goalId,
  contribution,
  goalCurrencyCode,
  initialWithdrawal = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: string;
  contribution?: GoalContribution;
  /** The goal's currency; needed to edit a contribution that was made in another one. */
  goalCurrencyCode?: string;
  /** Open on "Withdraw" (a new contribution only). */
  initialWithdrawal?: boolean;
}) {
  const [withdrawal, setWithdrawal] = React.useState(false);
  const [amount, setAmount] = React.useState("");
  const [contributedOn, setContributedOn] = React.useState("");
  const [note, setNote] = React.useState("");
  const [rateOverride, setRateOverride] = React.useState("");

  /** Made in another currency than the goal's: the amount is the original one and a rate converts it. */
  const foreign =
    contribution?.originalCurrency != null &&
    contribution.originalAmount !== null &&
    goalCurrencyCode !== undefined;
  const originalCurrency = foreign ? (contribution?.originalCurrency ?? "") : "";

  React.useEffect(() => {
    if (!open) return;
    setWithdrawal(contribution ? contribution.amount < 0 : initialWithdrawal);
    setRateOverride("");
    setAmount(
      contribution
        ? String(minorToMajorUnits(Math.abs(contribution.originalAmount ?? contribution.amount), 2))
        : "",
    );
    setContributedOn(contribution?.contributedOn ?? todayISODate());
    setNote(contribution?.note ?? "");
  }, [open, contribution, initialWithdrawal]);

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

  // Foreign contributions: the rate is the typed one, else the new day's historical rate when the date
  // moved, else the stored rate (an amount-only edit never changes the rate).
  const overrideRate = Number(rateOverride);
  const hasOverride = rateOverride !== "" && Number.isFinite(overrideRate) && overrideRate > 0;
  const dateMoved = Boolean(contribution) && contributedOn !== contribution?.contributedOn;
  const originalMinor = valid ? majorToMinorUnits(value, 2) : 0;
  const needsQuote = foreign && valid && !hasOverride && dateMoved;
  const quote = useContributionQuoteQuery(
    {
      fromCurrencyCode: originalCurrency,
      toCurrencyCode: goalCurrencyCode ?? "",
      date: contributedOn,
      amount: originalMinor,
    },
    needsQuote,
  );
  const preview = (() => {
    if (!foreign || !valid || !goalCurrencyCode) return null;
    const storedRate = contribution?.fxRate ?? null;
    if (hasOverride) {
      return {
        rate: overrideRate,
        rateDate: contributedOn,
        converted: convertMinorUnitsWithRate(originalMinor, overrideRate, 2, 2),
      };
    }
    if (needsQuote) {
      return quote.data
        ? {
            rate: quote.data.fxRate,
            rateDate: quote.data.fxRateDate,
            converted: quote.data.convertedAmount,
          }
        : null;
    }
    return storedRate === null
      ? null
      : {
          rate: storedRate,
          rateDate: contribution?.fxRateDate ?? null,
          converted: convertMinorUnitsWithRate(originalMinor, storedRate, 2, 2),
        };
  })();
  const quoting = needsQuote && quote.isFetching;
  const quoteFailed = needsQuote && quote.isError;
  const canSave = valid && !quoting && !quoteFailed;

  const submit = () => {
    if (!canSave) return;
    const minor = majorToMinorUnits(value, 2) * (withdrawal ? -1 : 1);
    const body = {
      amount: minor,
      contributedOn,
      note: note.trim() || null,
      ...(foreign
        ? hasOverride
          ? { fxRate: overrideRate }
          : dateMoved
            ? { recompute: true }
            : {}
        : {}),
    };
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
            <Label htmlFor="contribution-amount">
              {foreign ? `Amount in ${originalCurrency}` : "Amount"}
            </Label>
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
          {foreign && goalCurrencyCode ? (
            <div className="space-y-2">
              <div className="space-y-1.5">
                <Label htmlFor="contribution-rate">
                  Exchange rate ({goalCurrencyCode} per 1 {originalCurrency}), optional
                </Label>
                <NumberInput
                  id="contribution-rate"
                  decimals={10}
                  value={rateOverride}
                  onValueChange={setRateOverride}
                  placeholder="Leave empty to use the rate of that day"
                />
              </div>
              <div className="min-h-9 rounded-md bg-muted/50 px-3 py-2" aria-live="polite">
                {quoting ? (
                  <Skeleton className="h-5 w-48" />
                ) : quoteFailed ? (
                  <Typography variant="small-destructive">
                    No rate found for that day. Enter the rate yourself.
                  </Typography>
                ) : preview ? (
                  <ConversionDisplay
                    originalAmount={originalMinor}
                    originalCurrency={originalCurrency}
                    amount={preview.converted}
                    currencyCode={goalCurrencyCode}
                    fxRate={preview.rate}
                    rateDate={preview.rateDate}
                  />
                ) : (
                  <Typography variant="small-muted">
                    Enter an amount to see the conversion.
                  </Typography>
                )}
              </div>
            </div>
          ) : null}
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
          confirmDisabled={!canSave}
          isLoading={pending}
          loadingLabel="Saving..."
          onConfirm={submit}
        />
      </ModalContent>
    </Modal>
  );
}
