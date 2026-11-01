"use client";

import { Store01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { AccountInsights } from "@luraba/contracts";

import { AmountDisplay, MerchantDisplay } from "@/components/display";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PanelCard } from "@/components/finance/panel-card";
import { PanelCardSkeleton } from "@/components/states";
import { formatNumber } from "@/lib/finance";
import { useTransactionLookupsQuery } from "@/queries/transactions/use-transaction-lookups-query";

import { ACCOUNT_TOP_MERCHANTS } from "./account-detail-layout";

/** Where most of the period's money went, by merchant: a short ranked list for the side column. */
export function AccountTopMerchants({
  insights,
  isPending,
  error,
  onRetry,
  currencyCode,
  language,
  precision,
}: {
  insights: AccountInsights | undefined;
  isPending: boolean;
  error: { message: string } | null;
  onRetry: () => void;
  currencyCode: string;
  language: string;
  precision: number;
}) {
  const lookupsQuery = useTransactionLookupsQuery();
  if (isPending) {
    return (
      <PanelCardSkeleton fill={false} label="Loading top merchants" lines={ACCOUNT_TOP_MERCHANTS} />
    );
  }
  if (error) {
    return (
      <ErrorState
        title="Couldn't load top merchants"
        description={error.message}
        onRetry={onRetry}
      />
    );
  }
  const merchants = lookupsQuery.data?.merchants ?? [];
  const rows = (insights?.topMerchants ?? []).slice(0, ACCOUNT_TOP_MERCHANTS);

  return (
    <PanelCard
      title="Top merchants"
      description="Biggest spending in this period"
      icon={<HugeiconsIcon icon={Store01Icon} strokeWidth={2} />}
    >
      {rows.length === 0 ? (
        <EmptyState
          variant="embedded"
          title="No merchants yet"
          description="Spending with a merchant shows up here."
        />
      ) : (
        <ul className="divide-y divide-border/60">
          {rows.map((row) => {
            const merchant = merchants.find((item) => item.id === row.id);
            return (
              <li
                key={row.id ?? row.name}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <MerchantDisplay
                  merchant={merchant ?? { name: row.name, logoUrl: null, domain: null }}
                  size="md"
                />
                <span className="shrink-0 text-right">
                  <AmountDisplay
                    amount={row.amount}
                    currencyCode={currencyCode}
                    language={language}
                    precision={precision}
                    kind="expense"
                    showSign={false}
                    className="text-sm font-medium"
                  />
                  <span className="block text-xs text-muted-foreground">
                    {formatNumber(row.count, language)} {row.count === 1 ? "purchase" : "purchases"}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </PanelCard>
  );
}
