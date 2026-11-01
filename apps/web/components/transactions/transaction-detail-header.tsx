"use client";

import { ArrowLeft01Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { TransactionFeedRow } from "@luraba/contracts";
import { formatShortDate } from "@luraba/domain";
import {
  AmountDisplay,
  amountKindForTransactionType,
  TransactionTypeDisplay,
} from "@/components/display";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";
import { SidePanelDescription, SidePanelTitle } from "@/components/side-panel/side-panel";
import { Button } from "@/components/ui/button";
import type { TransactionLookups } from "@/queries/transactions/use-transaction-lookups-query";

/**
 * The header every transaction sheet shares. A top row with the type badge (or "Back to details"
 * while editing) and the primary action, then the title, then either the amount and date (details)
 * or a one-line hint (create and edit). The sheet itself never changes between modes, only this.
 */
export function TransactionSheetHeader({
  language,
  lookups,
  mode,
  onBack,
  onEdit,
  row,
}: {
  language: string;
  lookups: TransactionLookups;
  mode: "create" | "edit" | "view";
  onBack?: () => void;
  onEdit?: () => void;
  row?: TransactionFeedRow | null;
}) {
  if (mode === "view" && row) {
    const precision =
      lookups.currencies.find((item) => item.code === row.currencyCode)?.precision ?? 2;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <TransactionTypeDisplay type={row.originType} />
          <PermissionButton
            permission={PERMISSIONS.TRANSACTIONS_UPDATE}
            variant="outline"
            size="sm"
            onClick={onEdit}
          >
            <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
            Edit
          </PermissionButton>
        </div>
        <div className="space-y-1">
          <SidePanelTitle className="line-clamp-2 text-xl font-semibold tracking-tight">
            {row.description}
          </SidePanelTitle>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <AmountDisplay
              amount={row.amount}
              currencyCode={row.currencyCode}
              kind={amountKindForTransactionType(row.originType)}
              language={language}
              precision={precision}
              className="text-2xl font-semibold tracking-tight"
            />
            <span className="text-xs text-muted-foreground">
              Posted {formatShortDate(row.postedDate, language)}
            </span>
          </div>
        </div>
        <SidePanelDescription className="sr-only">
          Transaction details for {row.description}
        </SidePanelDescription>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {mode === "edit" && onBack ? (
        <Button type="button" variant="ghost" size="sm" className="-ml-2 w-fit" onClick={onBack}>
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
          Back to details
        </Button>
      ) : null}
      <div className="space-y-1">
        <SidePanelTitle className="text-xl font-semibold tracking-tight">
          {mode === "edit" ? "Edit transaction" : "New transaction"}
        </SidePanelTitle>
        <SidePanelDescription>
          {mode === "edit" && row
            ? row.description
            : "Add income, an expense, a transfer or a card transaction."}
        </SidePanelDescription>
      </div>
    </div>
  );
}
