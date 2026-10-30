"use client";

import type { CorporateActionSuggestion } from "@luraba/contracts";
import { formatShortDate } from "@luraba/domain";

import { InvestmentEventTypeDisplay } from "@/components/display";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateInvestmentEventMutation } from "@/mutations/investments/use-investments-mutations";
import { useCorporateActionsQuery } from "@/queries/investments/use-investments-queries";

import { useInvestmentFormat } from "./use-investment-format";

function describe(
  suggestion: CorporateActionSuggestion,
  format: ReturnType<typeof useInvestmentFormat>,
) {
  if (suggestion.kind === "DIVIDEND") {
    return `${format.unitPrice(suggestion.amountPerShare, suggestion.currencyCode)} per share on ${format.quantity(suggestion.quantityHeld)} held`;
  }
  return `${format.quantity(suggestion.ratioFrom)} for ${format.quantity(suggestion.ratioTo)}`;
}

/**
 * Splits and dividends the providers report for what you hold. Nothing is recorded until you
 * confirm: confirming creates the matching ledger event.
 */
export function CorporateActionSuggestions({ accountId }: { accountId?: string }) {
  const format = useInvestmentFormat();
  const query = useCorporateActionsQuery({ accountId });
  const create = useCreateInvestmentEventMutation({
    successToast: { title: "Recorded" },
  });
  const pending = (query.data ?? []).filter((item) => !item.alreadyRecorded);

  if (pending.length === 0) return null;

  const confirm = (item: CorporateActionSuggestion) => {
    if (item.kind === "DIVIDEND") {
      create.mutate({
        accountId: item.accountId,
        assetId: item.assetId,
        type: "DIVIDEND",
        tradeDate: item.paymentDate ?? item.date,
        grossAmount: item.suggestedGross ?? "0",
        currencyCode: item.currencyCode,
      });
      return;
    }
    create.mutate({
      accountId: item.accountId,
      assetId: item.assetId,
      type: item.kind,
      tradeDate: item.date,
      meta: {
        ratioFrom: item.ratioFrom ?? "1",
        ratioTo: item.ratioTo ?? "1",
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Suggested entries</CardTitle>
        <CardDescription>
          Reported by your market-data providers. Confirm to add them to your ledger.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {pending.map((item) => (
            <li
              key={`${item.accountId}-${item.assetId}-${item.kind}-${item.date}`}
              className="flex flex-wrap items-center justify-between gap-3 py-2.5"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{item.symbol}</span>
                  <InvestmentEventTypeDisplay type={item.kind} size="xs" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatShortDate(item.date, format.language)} · {describe(item, format)}
                </p>
              </div>
              <PermissionButton
                permission={PERMISSIONS.INVESTMENTS_WRITE}
                size="sm"
                variant="outline"
                isLoading={create.isPending}
                onClick={() => confirm(item)}
              >
                Record
              </PermissionButton>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
