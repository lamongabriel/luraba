"use client";

import { RefreshIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { InvestmentDashboard } from "@luraba/contracts";
import { now } from "@luraba/domain";
import * as React from "react";

import { PERMISSIONS, PermissionButton } from "@/components/permissions";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRefreshInvestmentPricesMutation } from "@/mutations/investments/use-investments-mutations";

import { formatAge } from "./format";

type Freshness = InvestmentDashboard["priceFreshness"];

/**
 * How current the prices on screen are. Cached quotes show at once; while the API refreshes stale
 * ones in the background the badge spins and the page polls, then it settles on the new age.
 */
export function FreshnessBadge({
  freshness,
  className,
}: {
  freshness: Freshness | undefined;
  className?: string;
}) {
  const [nowMs, setNowMs] = React.useState(() => now().getTime());
  React.useEffect(() => {
    const timer = window.setInterval(() => setNowMs(now().getTime()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const refresh = useRefreshInvestmentPricesMutation({
    successToast: { title: "Prices refreshed" },
  });
  const busy = Boolean(freshness?.refreshing) || refresh.isPending;
  const stale = freshness?.staleAssets ?? 0;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Badge variant="outline" className="gap-1.5" aria-live="polite">
        <span
          className={cn(
            "size-1.5 rounded-full",
            busy ? "animate-pulse bg-amber-500" : stale > 0 ? "bg-amber-500" : "bg-emerald-500",
          )}
          aria-hidden
        />
        {busy
          ? "Updating prices…"
          : freshness
            ? `Prices ${formatAge(freshness.oldestAsOf, nowMs)}`
            : "Prices —"}
      </Badge>
      {stale > 0 && !busy ? (
        <span className="text-xs text-muted-foreground">
          {stale} {stale === 1 ? "asset has" : "assets have"} an older price (market closed or
          provider delay)
        </span>
      ) : null}
      <PermissionButton
        permission={PERMISSIONS.INVESTMENTS_WRITE}
        whenDenied="hidden"
        variant="ghost"
        size="sm"
        isLoading={refresh.isPending}
        onClick={() => refresh.mutate(undefined)}
        aria-label="Refresh prices now"
      >
        <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} />
        Refresh
      </PermissionButton>
    </div>
  );
}
