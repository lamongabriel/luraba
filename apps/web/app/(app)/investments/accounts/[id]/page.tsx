"use client";

import { useParams } from "next/navigation";

import { AccountDisplay, AmountDisplay } from "@/components/display";
import { ErrorState } from "@/components/error-state";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { COST_BASIS_LABELS, TAX_PROFILE_LABELS } from "@/components/investments/constants";
import { CorporateActionSuggestions } from "@/components/investments/corporate-action-suggestions";
import { EventsTable } from "@/components/investments/events-table";
import { InvestmentAccountSheet } from "@/components/investments/forms/account-sheet";
import { CashMovementSheet } from "@/components/investments/forms/cash-movement-sheet";
import { EventSheet } from "@/components/investments/forms/event-sheet";
import { MetricCard } from "@/components/investments/metric-card";
import { PositionsTable } from "@/components/investments/positions-table";
import { useInvestmentFormat } from "@/components/investments/use-investment-format";
import { PERMISSIONS, PermissionButton, ResourceAccessBoundary } from "@/components/permissions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDisclosure } from "@/hooks/use-disclosure";
import {
  useInvestmentAccountQuery,
  useInvestmentEventsQuery,
  usePositionsQuery,
} from "@/queries/investments/use-investments-queries";

export default function InvestmentAccountPage() {
  const { id } = useParams<{ id: string }>();
  const format = useInvestmentFormat();
  const account = useInvestmentAccountQuery(id);
  const positions = usePositionsQuery({ accountId: id });
  const events = useInvestmentEventsQuery({ accountId: id, perPage: 15 });
  const eventSheet = useDisclosure();
  const cashSheet = useDisclosure();
  const settingsSheet = useDisclosure();

  if (account.isPending) {
    return <Skeleton className="h-80 rounded-xl bg-muted/50" />;
  }
  if (account.isError) {
    return (
      <ResourceAccessBoundary
        error={account.error}
        resourceName="account"
        backHref="/investments/accounts"
        fallback={
          <ErrorState
            title="Couldn't load this account"
            description={account.error.message}
            onRetry={() => void account.refetch()}
          />
        }
      >
        {null}
      </ResourceAccessBoundary>
    );
  }

  const data = account.data;
  const precision = format.precisionOf(data.currencyCode);
  const money = (amount: number, currencyCode = data.currencyCode) => (
    <AmountDisplay
      amount={amount}
      currencyCode={currencyCode}
      precision={format.precisionOf(currencyCode)}
      language={format.language}
      size="md"
    />
  );

  return (
    <InternalPageLayout
      title={data.name}
      subtitle={
        <span className="inline-flex flex-wrap items-center gap-2">
          <AccountDisplay account={data} size="xs" detail="none" />
          <Badge variant="outline">{COST_BASIS_LABELS[data.costBasisMethod]}</Badge>
          <Badge variant="outline">{TAX_PROFILE_LABELS[data.taxProfile]}</Badge>
        </span>
      }
      back={{ href: "/investments/accounts", label: "Accounts" }}
      createdBy={data.createdByUserId}
      actions={
        <div className="flex items-center gap-2">
          <PermissionButton
            permission={PERMISSIONS.INVESTMENTS_WRITE}
            variant="outline"
            onClick={settingsSheet.onOpen}
          >
            Settings
          </PermissionButton>
          <PermissionButton
            permission={PERMISSIONS.INVESTMENTS_WRITE}
            variant="outline"
            onClick={cashSheet.onOpen}
          >
            Cash movement
          </PermissionButton>
          <PermissionButton permission={PERMISSIONS.INVESTMENTS_WRITE} onClick={eventSheet.onOpen}>
            New transaction
          </PermissionButton>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Total value" value={money(data.totalValue)} />
        <MetricCard label="Positions" value={money(data.positionsValue)} />
        <MetricCard
          label="Cash"
          value={
            data.cash.length === 0 ? (
              <span className="text-muted-foreground">None</span>
            ) : (
              <span className="flex flex-col gap-0.5 text-base">
                {data.cash.map((balance) => (
                  <span key={balance.currencyCode}>
                    {money(balance.amount, balance.currencyCode)}
                  </span>
                ))}
              </span>
            )
          }
        />
      </div>

      <CorporateActionSuggestions accountId={id} />

      <Card>
        <CardHeader>
          <CardTitle>Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          {(positions.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No positions in this account yet.</p>
          ) : (
            <PositionsTable positions={positions.data ?? []} currencyCode={data.currencyCode} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {(events.data?.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <EventsTable events={events.data?.data ?? []} />
          )}
        </CardContent>
      </Card>

      <p className="sr-only">Amounts are shown to {precision} decimal places.</p>
      <EventSheet
        open={eventSheet.isOpen}
        onOpenChange={eventSheet.setIsOpen}
        seed={{ accountId: id }}
      />
      <CashMovementSheet
        open={cashSheet.isOpen}
        onOpenChange={cashSheet.setIsOpen}
        accountId={id}
      />
      <InvestmentAccountSheet
        open={settingsSheet.isOpen}
        onOpenChange={settingsSheet.setIsOpen}
        account={data}
      />
    </InternalPageLayout>
  );
}
