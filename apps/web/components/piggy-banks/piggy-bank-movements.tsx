"use client";

import type { PiggyBankMovement } from "@luraba/contracts";
import { formatShortDate } from "@luraba/domain";
import * as React from "react";

import { AmountDisplay } from "@/components/display";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { ListRow, ListSkeleton } from "@/components/lists";
import { Button } from "@/components/ui/button";
import { PIGGY_MOVEMENT_LABELS } from "@/lib/piggy-banks";
import { usePiggyBankMovementsQuery } from "@/queries/piggy-banks/use-piggy-banks-queries";

const PAGE_SIZE = 10;

function movementSubtitle(movement: PiggyBankMovement): string {
  const parts: string[] = [];
  if (movement.counterpart) parts.push(movement.counterpart.title);
  if (movement.estimated) parts.push("estimated");
  if (movement.note) parts.push(movement.note);
  return parts.join(" · ");
}

/** The movements of one piggy bank as a plain list of rows (the same on every screen size), newest first. */
export function PiggyBankMovements({
  piggyBankId,
  currencyCode,
  language,
}: {
  piggyBankId: string;
  currencyCode: string;
  language: string;
}) {
  const [page, setPage] = React.useState(1);
  const query = usePiggyBankMovementsQuery(piggyBankId, { page: 1, perPage: PAGE_SIZE * page });
  const rows = query.data?.data ?? [];
  const total = query.data?.meta.pagination.totalCount ?? 0;

  if (query.isPending) return <ListSkeleton rows={PAGE_SIZE} />;
  if (query.isError) {
    return (
      <ErrorState
        title="Couldn't load the movements"
        description={query.error?.message}
        onRetry={() => void query.refetch()}
      />
    );
  }
  if (rows.length === 0) {
    return (
      <EmptyState
        variant="embedded"
        title="No movements yet"
        description="Deposits, withdrawals and daily interest show up here."
      />
    );
  }
  return (
    <div>
      {rows.map((movement) => (
        <ListRow
          key={movement.id}
          title={PIGGY_MOVEMENT_LABELS[movement.kind]}
          subtitle={movementSubtitle(movement)}
          amount={
            <AmountDisplay
              amount={movement.amount}
              currencyCode={currencyCode}
              language={language}
              kind="auto"
            />
          }
          meta={formatShortDate(movement.occurredOn, language)}
        />
      ))}
      {rows.length < total ? (
        <div className="flex justify-center pt-3">
          <Button type="button" variant="ghost" onClick={() => setPage((current) => current + 1)}>
            Show more
          </Button>
        </div>
      ) : null}
    </div>
  );
}
