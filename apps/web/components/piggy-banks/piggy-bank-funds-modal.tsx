"use client";

import type { PiggyBank } from "@luraba/contracts";
import { formatMoney, todayISODate } from "@luraba/domain";
import * as React from "react";
import { AccountSelectControl, AmountDisplay, PiggyBankDisplay } from "@/components/display";
import { ComboboxControl } from "@/components/forms/form-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput, MoneyInput } from "@/components/ui/masked-input";
import { Modal, ModalBody, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { Typography } from "@/components/ui/typography";
import { useCurrencyPrecision } from "@/hooks/use-currency-precision";
import { majorToMinorUnits } from "@/lib/finance";
import {
  useBulkDepositMutation,
  useDepositToPiggyBankMutation,
  useMovePiggyBankFundsMutation,
  useSetPiggyBankBalanceMutation,
  useWithdrawFromPiggyBankMutation,
} from "@/mutations/piggy-banks/use-piggy-bank-mutations";
import { useAccountsQuery } from "@/queries/accounts/use-accounts-query";
import { useAuthSessionStore, useDefaultCurrencyCode } from "@/stores/auth-session-store";

export type PiggyFundsMode = "deposit" | "withdraw" | "move" | "balance";

const MODES: { value: PiggyFundsMode; label: string }[] = [
  { value: "deposit", label: "Deposit" },
  { value: "withdraw", label: "Withdraw" },
  { value: "move", label: "Move" },
  { value: "balance", label: "Balance" },
];

const TITLES: Record<PiggyFundsMode, string> = {
  deposit: "Deposit into a piggy bank",
  withdraw: "Withdraw from a piggy bank",
  move: "Move between piggy banks",
  balance: "Set the real balance",
};

const DESCRIPTIONS: Record<PiggyFundsMode, string> = {
  deposit:
    "From another account (a transfer is recorded) or from the free balance of the account it sits in.",
  withdraw: "To another account (a transfer is recorded) or back to the account's free balance.",
  move: "Only the buckets change: the account's balance and your reports stay the same.",
  balance:
    "Type what your bank shows. The difference becomes an adjustment and the daily interest starts again from it.",
};

/**
 * Deposit, withdraw, move or set the real balance of a piggy bank in one modal (`initialMode` picks the tab).
 * A deposit can be split across the piggy banks of the same account (one transfer, many piggy banks).
 */
export function PiggyBankFundsModal({
  open,
  onOpenChange,
  piggyBank,
  siblings,
  initialMode = "deposit",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  piggyBank: PiggyBank | null;
  /** Every piggy bank of the household; the ones of the same account are offered for moves and splits. */
  siblings: PiggyBank[];
  initialMode?: PiggyFundsMode;
}) {
  const language = useAuthSessionStore((state) => state.user?.preferences.language ?? "en");
  const defaultCurrency = useDefaultCurrencyCode();
  const precisionOf = useCurrencyPrecision();
  const accounts = useAccountsQuery({ perPage: 200 });
  const [mode, setMode] = React.useState<PiggyFundsMode>(initialMode);
  const [amount, setAmount] = React.useState("");
  const [otherAccount, setOtherAccount] = React.useState(false);
  const [accountId, setAccountId] = React.useState("");
  const [targetId, setTargetId] = React.useState("");
  const [date, setDate] = React.useState("");
  const [note, setNote] = React.useState("");
  const [split, setSplit] = React.useState(false);
  const [shares, setShares] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setAmount("");
    setOtherAccount(false);
    setAccountId("");
    setTargetId("");
    setDate(todayISODate());
    setNote("");
    setSplit(false);
    setShares({});
  }, [open, initialMode]);

  const close = () => onOpenChange(false);
  const refetchOptions = { onSuccess: close, successToast: { title: "Saved" } };
  const deposit = useDepositToPiggyBankMutation(refetchOptions);
  const bulk = useBulkDepositMutation(refetchOptions);
  const withdraw = useWithdrawFromPiggyBankMutation(refetchOptions);
  const move = useMovePiggyBankFundsMutation(refetchOptions);
  const setBalance = useSetPiggyBankBalanceMutation(refetchOptions);
  const pending =
    deposit.isPending ||
    bulk.isPending ||
    withdraw.isPending ||
    move.isPending ||
    setBalance.isPending;
  const errorMessage =
    deposit.errorMessage ||
    bulk.errorMessage ||
    withdraw.errorMessage ||
    move.errorMessage ||
    setBalance.errorMessage;

  const currency = piggyBank?.currencyCode ?? defaultCurrency;
  const precision = precisionOf(currency);
  const sameAccount = siblings.filter(
    (item) =>
      item.parentAccountId === piggyBank?.parentAccountId &&
      item.id !== piggyBank?.id &&
      item.archivedAt === null,
  );
  const otherAccounts = (accounts.data?.data ?? []).filter(
    (account) =>
      account.id !== piggyBank?.parentAccountId &&
      account.currencyCode === currency &&
      !account.archivedAt,
  );
  const value = Number(amount);
  const splitTargets = piggyBank ? [piggyBank, ...sameAccount] : [];
  const splitTotal = splitTargets.reduce((sum, item) => sum + (Number(shares[item.id]) || 0), 0);

  const needsAccount = otherAccount && (mode === "deposit" || mode === "withdraw");
  const accountOk = !needsAccount || Boolean(accountId);
  const valid =
    Boolean(piggyBank && date) &&
    accountOk &&
    (mode === "balance"
      ? amount !== "" && Number.isFinite(value) && value >= 0
      : mode === "deposit" && split
        ? splitTotal > 0
        : Number.isFinite(value) && value > 0) &&
    (mode !== "move" || Boolean(targetId));

  const submit = () => {
    if (!piggyBank || !valid) return;
    const common = { date, note: note.trim() || null };
    if (mode === "deposit" && split) {
      bulk.mutate({
        ...common,
        fromAccountId: otherAccount ? accountId : null,
        allocations: splitTargets
          .filter((item) => Number(shares[item.id]) > 0)
          .map((item) => ({
            piggyBankId: item.id,
            amount: majorToMinorUnits(Number(shares[item.id]), precision),
          })),
      });
    } else if (mode === "deposit") {
      deposit.mutate({
        id: piggyBank.id,
        body: {
          ...common,
          amount: majorToMinorUnits(value, precision),
          fromAccountId: otherAccount ? accountId : null,
        },
      });
    } else if (mode === "withdraw") {
      withdraw.mutate({
        id: piggyBank.id,
        body: {
          ...common,
          amount: majorToMinorUnits(value, precision),
          toAccountId: otherAccount ? accountId : null,
        },
      });
    } else if (mode === "move") {
      move.mutate({
        ...common,
        fromPiggyBankId: piggyBank.id,
        toPiggyBankId: targetId,
        amount: majorToMinorUnits(value, precision),
      });
    } else {
      setBalance.mutate({
        id: piggyBank.id,
        body: { ...common, balance: majorToMinorUnits(value, precision) },
      });
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        title={piggyBank ? `${TITLES[mode]}` : "Piggy bank"}
        description={DESCRIPTIONS[mode]}
        isLoading={pending}
        size="sm"
      >
        <ModalBody className="space-y-3">
          {piggyBank ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
              <PiggyBankDisplay piggyBank={piggyBank} size="md" />
              <AmountDisplay
                amount={piggyBank.balance}
                currencyCode={currency}
                language={language}
                precision={precision}
                className="tabular-nums"
              />
            </div>
          ) : null}
          <div className="grid grid-cols-4 gap-1.5">
            {MODES.map((item) => (
              <Button
                key={item.value}
                type="button"
                size="sm"
                variant={mode === item.value ? "default" : "outline"}
                onClick={() => setMode(item.value)}
              >
                {item.label}
              </Button>
            ))}
          </div>

          {mode === "move" ? (
            <div className="space-y-1.5">
              <Label htmlFor="piggy-target">To</Label>
              <ComboboxControl
                id="piggy-target"
                value={targetId}
                onChange={setTargetId}
                placeholder={
                  sameAccount.length === 0
                    ? "No other piggy bank in this account"
                    : "Choose a piggy bank"
                }
                disabled={sameAccount.length === 0}
                options={sameAccount.map((item) => ({ value: item.id, label: item.title }))}
                renderOption={(option) => (
                  <PiggyBankDisplay
                    piggyBank={sameAccount.find((item) => item.id === option.value)}
                    size="md"
                  />
                )}
              />
            </div>
          ) : null}

          {mode === "deposit" && sameAccount.length > 0 ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
              <div className="min-w-0">
                <Label htmlFor="piggy-split">Split across piggy banks</Label>
                <Typography variant="small-muted">
                  One transfer, shared by this account's piggy banks.
                </Typography>
              </div>
              <Switch id="piggy-split" checked={split} onCheckedChange={setSplit} />
            </div>
          ) : null}

          {mode === "deposit" && split ? (
            <div className="space-y-2">
              {splitTargets.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <PiggyBankDisplay piggyBank={item} size="sm" className="flex-1" />
                  <MoneyInput
                    aria-label={`Amount for ${item.title}`}
                    className="w-32"
                    precision={precision}
                    value={shares[item.id] ?? ""}
                    onValueChange={(next) =>
                      setShares((current) => ({ ...current, [item.id]: next }))
                    }
                  />
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-border/60 pt-2 text-sm">
                <span className="text-muted-foreground">Total</span>
                <AmountDisplay
                  amount={majorToMinorUnits(splitTotal, precision)}
                  currencyCode={currency}
                  language={language}
                  precision={precision}
                  className="font-medium tabular-nums"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="piggy-amount">
                {mode === "balance" ? "Balance your bank shows" : "Amount"}
              </Label>
              <MoneyInput
                id="piggy-amount"
                precision={precision}
                value={amount}
                onValueChange={setAmount}
              />
              {mode === "balance" && piggyBank ? (
                <Typography variant="small-muted">
                  Computed now: {formatMoney(piggyBank.balance, currency, { precision })}
                </Typography>
              ) : null}
            </div>
          )}

          {mode === "deposit" || mode === "withdraw" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="piggy-other">
                  {mode === "deposit"
                    ? "Money comes from another account"
                    : "Send to another account"}
                </Label>
                <Switch id="piggy-other" checked={otherAccount} onCheckedChange={setOtherAccount} />
              </div>
              {otherAccount ? (
                <AccountSelectControl
                  id="piggy-account"
                  value={accountId}
                  onChange={setAccountId}
                  accounts={otherAccounts}
                  placeholder="Choose an account"
                />
              ) : (
                <Typography variant="small-muted">
                  {mode === "deposit"
                    ? `Taken from the free balance of ${piggyBank?.parentAccountName ?? "the account"}.`
                    : `Stays in ${piggyBank?.parentAccountName ?? "the account"} as free balance.`}
                </Typography>
              )}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="piggy-date">Date</Label>
            <DateInput id="piggy-date" value={date} onValueChange={setDate} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="piggy-note">Note</Label>
            <Input
              id="piggy-note"
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
