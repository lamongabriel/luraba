"use client";

import type { AssetClass } from "@luraba/contracts";
import { keepPreviousData } from "@tanstack/react-query";
import * as React from "react";

import { ASSET_CLASS_DISPLAY } from "@/components/display";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { FreshnessBadge } from "@/components/investments/freshness-badge";
import { PositionsTable } from "@/components/investments/positions-table";
import { ScopeBar } from "@/components/investments/scope-bar";
import { scopeQuery, useInvestmentScope } from "@/components/investments/use-investment-scope";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useInvestmentDashboardQuery,
  useInvestmentSettingsQuery,
  usePositionsQuery,
} from "@/queries/investments/use-investments-queries";

const ALL = "all";

export default function HoldingsPage() {
  const scope = useInvestmentScope();
  const [search, setSearch] = React.useState("");
  const [assetClass, setAssetClass] = React.useState<string>(ALL);
  const query = scopeQuery(scope);
  const positions = usePositionsQuery(query, { placeholderData: keepPreviousData });
  const dashboard = useInvestmentDashboardQuery(query, { placeholderData: keepPreviousData });
  const settings = useInvestmentSettingsQuery();
  const currencyCode =
    dashboard.data?.reportingCurrencyCode ?? settings.data?.reportingCurrencyCode ?? "USD";

  const filtered = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (positions.data ?? []).filter(
      (position) =>
        (assetClass === ALL || position.assetClass === assetClass) &&
        (!needle ||
          position.symbol.toLowerCase().includes(needle) ||
          position.name.toLowerCase().includes(needle)),
    );
  }, [positions.data, search, assetClass]);
  const classes = React.useMemo(
    () => [...new Set((positions.data ?? []).map((position) => position.assetClass))],
    [positions.data],
  );

  let content: React.ReactNode;
  if (positions.isPending) {
    content = <Skeleton className="h-72 rounded-xl bg-muted/50" />;
  } else if (positions.isError) {
    content = (
      <ErrorState
        title="Couldn't load your holdings"
        description={positions.error.message}
        onRetry={() => void positions.refetch()}
      />
    );
  } else if (positions.data.length === 0) {
    content = (
      <EmptyState
        title="No holdings yet"
        description="Positions appear here after you record a buy or import a statement."
      />
    );
  } else {
    content = (
      <PositionsTable
        positions={filtered}
        currencyCode={currencyCode}
        valueMode={scope.net ? "net" : "market"}
      />
    );
  }

  return (
    <InternalPageLayout
      title="Holdings"
      subtitle="Every position with its average cost, latest price and result."
      back={{ href: "/investments", label: "Overview" }}
      actions={<FreshnessBadge freshness={dashboard.data?.priceFreshness} />}
    >
      <div className="flex flex-wrap items-center gap-3">
        <ScopeBar scope={scope} />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search symbol or name"
          aria-label="Search holdings"
          className="w-56"
        />
        <Select value={assetClass} onValueChange={setAssetClass}>
          <SelectTrigger className="w-48" aria-label="Asset class">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All classes</SelectItem>
            {classes.map((item) => (
              <SelectItem key={item} value={item}>
                {ASSET_CLASS_DISPLAY[item as AssetClass].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {content}
    </InternalPageLayout>
  );
}
