"use client";

import { PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { TransactionFeedRow } from "@luraba/contracts";
import { formatShortDate } from "@luraba/domain";
import { MoneyValue } from "@/components/finance/money-value";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";
import { SidePanelTitle } from "@/components/side-panel/side-panel";
import { SidePanelEntityRow } from "@/components/side-panel/side-panel-entity-row";
import {
  TransactionAccountPanelDisplay,
  TransactionMerchantPanelDisplay,
} from "@/components/tables/transactions/transaction-resource-display";
import { TransactionTypeBadge } from "@/components/tables/transactions/transaction-type-badge";
import type { TransactionLookups } from "@/queries/transactions/use-transaction-lookups-query";

export function TransactionDetailHeader({
  language,
  lookups,
  merchantId,
  onEdit,
  row,
}: {
  language: string;
  lookups: TransactionLookups;
  merchantId: string | null;
  onEdit: () => void;
  row: TransactionFeedRow;
}) {
  const precision =
    lookups.currencies.find((item) => item.code === row.currencyCode)?.precision ?? 2;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <SidePanelTitle className="truncate text-lg font-semibold tracking-tight">
            {row.description}
          </SidePanelTitle>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <TransactionTypeBadge type={row.originType} />
            <span aria-hidden="true">•</span>
            <span>{formatShortDate(row.postedDate, language)}</span>
          </div>
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
        <div className="shrink-0 pt-1 text-right">
          <MoneyValue
            amount={row.amount}
            currencyCode={row.currencyCode}
            language={language}
            precision={precision}
            className="text-lg font-semibold"
          />
        </div>
      </div>

      <div className="space-y-1">
        <SidePanelEntityRow label={row.originType === "transfer" ? "From" : "Account"}>
          <TransactionAccountPanelDisplay row={row} lookups={lookups} />
        </SidePanelEntityRow>
        {row.originType === "transfer" ? (
          <SidePanelEntityRow label="To">
            <TransactionAccountPanelDisplay
              accountId={row.toAccountId}
              accountName={row.toAccountName}
              row={row}
              lookups={lookups}
            />
          </SidePanelEntityRow>
        ) : (
          <SidePanelEntityRow label="Merchant">
            <TransactionMerchantPanelDisplay merchantId={merchantId} lookups={lookups} />
          </SidePanelEntityRow>
        )}
      </div>
    </div>
  );
}
