"use client";

import { Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { PERMISSIONS } from "@luraba/contracts";
import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { CurrencyDisplay, CurrencySelectControl } from "@/components/display";
import { ErrorState } from "@/components/error-state";
import { useCan } from "@/components/permissions/use-can";
import { SectionBlock, SectionCard, SectionRow } from "@/components/section/section-card";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/masked-input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/finance";
import {
  useDeleteFxOverrideMutation,
  useSetFxOverrideMutation,
} from "@/mutations/fx/use-fx-mutations";
import { useFxOverridesQuery } from "@/queries/fx/use-fx-queries";

/**
 * Combined totals convert every currency to the household base currency with the latest market rate.
 * Here the owner can pin a rate for a pair instead (it wins until removed), e.g. the rate the bank
 * actually gives. The base currency itself is the household's default currency.
 */
export function HouseholdFxRates({ baseCurrencyCode }: { baseCurrencyCode: string }) {
  const client = useQueryClient();
  const canEdit = useCan()(PERMISSIONS.HOUSEHOLD_UPDATE);
  const overrides = useFxOverridesQuery();
  const [from, setFrom] = React.useState("");
  const [rate, setRate] = React.useState("");

  // Totals everywhere depend on the rates: refetch what is on screen after a change.
  const refresh = () => client.invalidateQueries();
  const save = useSetFxOverrideMutation({
    onSuccess: async () => {
      setFrom("");
      setRate("");
      await refresh();
      toast.success("Exchange rate saved");
    },
  });
  const remove = useDeleteFxOverrideMutation({ onSuccess: refresh });

  const rateNumber = Number(rate.replace(",", "."));
  const valid =
    from !== "" && from !== baseCurrencyCode && Number.isFinite(rateNumber) && rateNumber > 0;

  let body: React.ReactNode;
  if (overrides.isPending) {
    body = <Skeleton className="h-20 w-full" />;
  } else if (overrides.isError) {
    body = (
      <ErrorState
        title="Couldn't load the exchange rates"
        description={overrides.error?.message}
        onRetry={() => void overrides.refetch()}
      />
    );
  } else {
    body = (
      <>
        {overrides.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No rates pinned. Totals use the latest market rate.
          </p>
        ) : (
          overrides.data.map((item) => (
            <SectionRow
              key={`${item.fromCurrencyCode}-${item.toCurrencyCode}`}
              title={
                <span className="inline-flex items-center gap-1.5">
                  1 <CurrencyDisplay currencyCode={item.fromCurrencyCode} size="sm" />
                </span>
              }
              description={`= ${formatNumber(item.rate, "en", { maximumFractionDigits: 6 })} ${item.toCurrencyCode}`}
            >
              {canEdit ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove the ${item.fromCurrencyCode} rate`}
                  onClick={() =>
                    remove.mutate({
                      fromCurrencyCode: item.fromCurrencyCode,
                      toCurrencyCode: item.toCurrencyCode,
                    })
                  }
                  className="text-destructive hover:text-destructive"
                >
                  <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                </Button>
              ) : null}
            </SectionRow>
          ))
        )}
        {canEdit ? (
          <SectionBlock
            title="Pin a rate"
            description={`How many ${baseCurrencyCode} one unit is worth.`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 sm:w-48">
                <CurrencySelectControl
                  id="fx-override-from"
                  value={from}
                  onChange={setFrom}
                  exclude={[baseCurrencyCode]}
                  placeholder="Currency"
                />
              </div>
              <div className="min-w-0 sm:w-48">
                <NumberInput
                  aria-label={`Rate in ${baseCurrencyCode}`}
                  value={rate}
                  onValueChange={setRate}
                  decimals={6}
                  suffix={baseCurrencyCode}
                  placeholder="5.40"
                />
              </div>
              <Button
                disabled={!valid || save.isPending}
                onClick={() =>
                  save.mutate({
                    fromCurrencyCode: from,
                    toCurrencyCode: baseCurrencyCode,
                    rate: rateNumber,
                  })
                }
              >
                Save rate
              </Button>
            </div>
          </SectionBlock>
        ) : null}
      </>
    );
  }

  return (
    <SectionCard
      title="Exchange rates"
      description={`Totals that mix currencies are shown in ${baseCurrencyCode}, converted at the latest market rate.`}
    >
      {body}
    </SectionCard>
  );
}
