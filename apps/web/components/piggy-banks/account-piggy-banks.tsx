"use client";

import { PiggyBankIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Account } from "@luraba/contracts";
import Link from "next/link";

import { AmountDisplay, PiggyBankMark } from "@/components/display";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PanelCard } from "@/components/finance/panel-card";
import { ListRow } from "@/components/lists";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePiggyBanksQuery } from "@/queries/piggy-banks/use-piggy-banks-queries";

/**
 * Side panel of a cash account's page: the free balance (what no piggy bank holds) and the account's
 * piggy banks. Renders nothing for other account types.
 */
export function AccountPiggyBanks({
  account,
  language,
  precision,
}: {
  account: Account;
  language: string;
  precision: number;
}) {
  const query = usePiggyBanksQuery({ parentAccountId: account.id });
  const money = { currencyCode: account.currencyCode, language, precision };
  const summary = query.data?.accounts.find((row) => row.accountId === account.id);
  const piggyBanks = query.data?.piggyBanks ?? [];

  if (account.type !== "cash") return null;
  const action = (
    <Button asChild variant="ghost" size="sm">
      <Link href="/piggy-banks">Manage</Link>
    </Button>
  );

  return (
    <PanelCard
      title="Piggy banks"
      icon={<HugeiconsIcon icon={PiggyBankIcon} strokeWidth={2} />}
      description="Parts of this balance, with their own interest."
      actions={action}
    >
      {query.isPending ? (
        <div className="space-y-2" role="status" aria-label="Loading piggy banks">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : query.isError ? (
        <ErrorState
          title="Couldn't load piggy banks"
          description={query.error?.message}
          onRetry={() => void query.refetch()}
        />
      ) : piggyBanks.length === 0 ? (
        <EmptyState
          variant="embedded"
          title="No piggy banks here"
          description="Split this balance into named buckets that earn."
        />
      ) : (
        <div>
          <ListRow
            title="Free balance"
            subtitle="Not in any piggy bank"
            amount={
              <AmountDisplay
                amount={summary?.free ?? 0}
                {...money}
                kind={(summary?.free ?? 0) < 0 ? "expense" : "neutral"}
              />
            }
          />
          {piggyBanks.map((piggy) => (
            <ListRow
              key={piggy.id}
              leading={<PiggyBankMark piggyBank={piggy} size="md" />}
              title={piggy.title}
              subtitle={piggy.yield.label}
              amount={<AmountDisplay amount={piggy.balance} {...money} />}
            />
          ))}
        </div>
      )}
    </PanelCard>
  );
}
