"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { creditCardQueryKeys } from "@/queries/credit-cards/use-credit-cards-query";
import { listCreditCardCycles, listCreditCards } from "@/services/credit-cards.service";

const CARD_LIMIT = 100;
// The cycle a card is in right now ("current"), not the unbilled future ones that are also `open`.
const CYCLE_QUERY = { displayStatuses: ["current" as const], perPage: 1 };

/**
 * When each card's currently open billing cycle started: the earliest of these (or the 1st of the month) opens the
 * transactions page's default "This month" range, so purchases in a cycle that began last month show up. Uses the
 * existing cards and cycles endpoints. `ready` turns true once the answer is known, including when there are no cards
 * or the household role cannot read them (then the range is the plain month), so a page never waits forever.
 */
export function useOpenCycleStarts({ enabled = true }: { enabled?: boolean } = {}) {
  const cardsQuery = useQuery({
    queryKey: creditCardQueryKeys.list({ perPage: CARD_LIMIT }),
    queryFn: () => listCreditCards({ perPage: CARD_LIMIT }),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
  const cards = cardsQuery.data?.data ?? [];
  const cycleQueries = useQueries({
    queries: cards.map((card) => ({
      queryKey: creditCardQueryKeys.cycles(card.id, CYCLE_QUERY),
      queryFn: () => listCreditCardCycles(card.id, CYCLE_QUERY),
      staleTime: 60_000,
      retry: false,
    })),
  });

  const cardsSettled = !enabled || cardsQuery.isSuccess || cardsQuery.isError;
  const cyclesSettled = cycleQueries.every((query) => !query.isPending);
  const starts = cycleQueries.flatMap((query) =>
    (query.data?.data ?? []).filter((cycle) => cycle.isCurrent).map((cycle) => cycle.periodStart),
  );

  return { ready: cardsSettled && cyclesSettled, starts };
}
