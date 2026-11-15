"use client";

import { MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { PiggyBank } from "@luraba/contracts";

import { AmountDisplay, PiggyBankMark } from "@/components/display";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { PIGGY_BANK_CARD_HEIGHT } from "./piggy-bank-layout";

export type PiggyBankAction =
  | "deposit"
  | "withdraw"
  | "move"
  | "balance"
  | "edit"
  | "open"
  | "archive"
  | "restore";

/**
 * One piggy bank as a compact card: cover and title with the account it sits in, the balance, what it
 * earned this month and its yield. The card opens the detail page; the menu has the money flows.
 */
export function PiggyBankCard({
  piggyBank,
  language,
  canUpdate,
  canDelete,
  onOpen,
  onAction,
}: {
  piggyBank: PiggyBank;
  language: string;
  canUpdate: boolean;
  canDelete: boolean;
  onOpen: (piggyBank: PiggyBank) => void;
  onAction: (action: PiggyBankAction, piggyBank: PiggyBank) => void;
}) {
  const money = { currencyCode: piggyBank.currencyCode, language };
  const archived = piggyBank.archivedAt !== null;

  return (
    <li
      className={cn(
        "relative flex flex-col justify-between rounded-xl border border-border/60 bg-card p-4 transition-colors hover:bg-muted/40",
        archived && "opacity-70",
        PIGGY_BANK_CARD_HEIGHT,
      )}
    >
      <button
        type="button"
        aria-label={`Open ${piggyBank.title}`}
        className="absolute inset-0 rounded-xl focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
        onClick={() => onOpen(piggyBank)}
      />

      <div className="pointer-events-none relative flex items-center gap-3">
        <PiggyBankMark piggyBank={piggyBank} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{piggyBank.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {archived ? "Archived" : piggyBank.parentAccountName}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`${piggyBank.title} actions`}
              className="pointer-events-auto relative -mr-1.5"
            >
              <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {canUpdate && !archived ? (
              <>
                <DropdownMenuItem onSelect={() => onAction("deposit", piggyBank)}>
                  Deposit
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onAction("withdraw", piggyBank)}>
                  Withdraw
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onAction("move", piggyBank)}>
                  Move to another piggy bank
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onAction("balance", piggyBank)}>
                  Set real balance
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onAction("edit", piggyBank)}>
                  Edit piggy bank
                </DropdownMenuItem>
              </>
            ) : null}
            <DropdownMenuItem onSelect={() => onAction("open", piggyBank)}>
              Full details
            </DropdownMenuItem>
            {canDelete ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant={archived ? "default" : "destructive"}
                  onSelect={() => onAction(archived ? "restore" : "archive", piggyBank)}
                >
                  {archived ? "Restore" : "Archive"}
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="pointer-events-none relative">
        <AmountDisplay
          amount={piggyBank.balance}
          {...money}
          size="lg"
          className="font-semibold tabular-nums"
        />
      </div>

      <div className="pointer-events-none relative flex items-center justify-between gap-2 text-xs">
        <span className="truncate text-muted-foreground">{piggyBank.yield.label}</span>
        {piggyBank.monthEarnings > 0 ? (
          <span className="shrink-0 font-medium text-muted-foreground">
            <AmountDisplay amount={piggyBank.monthEarnings} {...money} kind="income" size="xs" />{" "}
            this month
          </span>
        ) : null}
      </div>
    </li>
  );
}
