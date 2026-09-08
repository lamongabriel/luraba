"use client";

import { Add01Icon, CreditCardIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { CreditCard, ListCreditCardsQuery } from "@luraba/contracts";
import { MAX_PER_PAGE } from "@luraba/contracts";
import { parseAsString, useQueryState } from "nuqs";
import * as React from "react";
import { CreditCardActivity } from "@/components/credit-cards/credit-card-activity";
import { CreditCardCarousel } from "@/components/credit-cards/credit-card-carousel";
import { CreditCardKpiGrid } from "@/components/credit-cards/credit-card-kpi-grid";
import { CreditCardSheet } from "@/components/credit-cards/credit-card-sheet";
import { DataTableSearchInput } from "@/components/data-table/data-table-search-input";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { FilterDate } from "@/components/filters/filter-date";
import { FilterFaceted } from "@/components/filters/filter-faceted";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { useApiParams } from "@/hooks/use-api-params";
import { CREDIT_CARD_BRAND_OPTIONS } from "@/lib/credit-cards";
import { formatDate, parseDateValue } from "@/lib/format";
import { useAccountsQuery } from "@/queries/accounts/use-accounts-query";
import {
  useCreditCardCyclesQuery,
  useCreditCardQuery,
  useCreditCardsQuery,
} from "@/queries/credit-cards/use-credit-cards-query";
import { useCurrenciesQuery } from "@/queries/currencies/use-currencies-query";
import { useAuthSessionStore } from "@/stores/auth-session-store";

const cardFilterConfigs = {
  brands: { type: "stringArray" },
  ownerAccountIds: { type: "stringArray" },
  createdAtFrom: { type: "string" },
  createdAtTo: { type: "string" },
} as const;

const cardSortFields = ["name", "brand", "balance", "creditLimitAmount", "createdAt"] as const;

function CreditCardsLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading credit cards" role="status">
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
      </div>
      <Skeleton className="h-72" />
      <Skeleton className="h-32" />
    </div>
  );
}

function parseDateRange(value: string | undefined) {
  return parseDateValue(value);
}

function formatDateFilterValue(value: Date | undefined) {
  return value ? formatDate(value, { formatString: "yyyy-MM-dd" }) : null;
}

function CreditCardFilters({
  params,
  ownerOptions,
}: {
  params: ReturnType<
    typeof useApiParams<typeof cardFilterConfigs, (typeof cardSortFields)[number]>
  >;
  ownerOptions: Array<{ value: string; label: string; description?: string }>;
}) {
  const createdRange = React.useMemo(() => {
    const from = parseDateRange(params.filters.createdAtFrom);
    const to = parseDateRange(params.filters.createdAtTo);
    return from || to ? { from, to } : undefined;
  }, [params.filters.createdAtFrom, params.filters.createdAtTo]);

  const onCreatedRangeChange = React.useCallback(
    (value: Date | { from?: Date; to?: Date } | undefined) => {
      if (!value) {
        params.setFilters({ createdAtFrom: null, createdAtTo: null });
        return;
      }

      if (value instanceof Date) {
        const date = formatDateFilterValue(value);
        params.setFilters({ createdAtFrom: date, createdAtTo: date });
        return;
      }

      params.setFilters({
        createdAtFrom: formatDateFilterValue(value.from),
        createdAtTo: formatDateFilterValue(value.to),
      });
    },
    [params],
  );

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <DataTableSearchInput
        value={params.search}
        onChange={(event) => params.setSearch(event.target.value)}
        placeholder="Search credit cards..."
        aria-label="Search credit cards"
        className="w-full sm:w-56"
      />
      <FilterFaceted
        title="Brand"
        options={CREDIT_CARD_BRAND_OPTIONS.map((option) => ({
          value: option.value,
          label: option.label,
        }))}
        multiple
        value={params.filters.brands}
        onValueChange={(value) => params.setFilter("brands", Array.isArray(value) ? value : null)}
      />
      <FilterFaceted
        title="Owner account"
        options={ownerOptions}
        multiple
        value={params.filters.ownerAccountIds}
        onValueChange={(value) =>
          params.setFilter("ownerAccountIds", Array.isArray(value) ? value : null)
        }
      />
      <FilterDate
        title="Added"
        multiple
        value={createdRange}
        disabled={{ after: new Date() }}
        onValueChange={onCreatedRangeChange}
      />
      {params.hasFilters ? (
        <Button type="button" variant="ghost" size="sm" onClick={params.clearFilters}>
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}

function SelectedCardWorkspace({
  card,
  language,
  precision,
  onEdit,
}: {
  card: CreditCard;
  language: string;
  precision: number;
  onEdit: () => void;
}) {
  const cyclesQuery = useCreditCardCyclesQuery(card.id, {
    scope: "default",
    page: 1,
    perPage: 12,
    sort: "periodStart",
    sortDirection: "asc",
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
          <div className="min-w-0">
            <CardTitle>{card.name}</CardTitle>
            <CardDescription className="mt-1">
              {card.brand} · {card.ownerAccount.name} · {card.currencyCode}
            </CardDescription>
          </div>
          <PermissionButton
            permission={PERMISSIONS.CREDIT_CARDS_UPDATE}
            deniedMessage="Your household role cannot edit credit cards."
            variant="outline"
            size="sm"
            onClick={onEdit}
          >
            Edit card
          </PermissionButton>
        </CardHeader>
        <CardContent>
          <Typography variant="small-muted">
            Closes on day {card.closingDay} · due on day {card.dueDay}
          </Typography>
        </CardContent>
      </Card>

      <CreditCardKpiGrid
        card={card}
        cyclesQuery={cyclesQuery}
        language={language}
        precision={precision}
      />

      <CreditCardActivity card={card} language={language} precision={precision} />
    </div>
  );
}

export function CreditCardsWorkspace() {
  const [cardId, setCardId] = useQueryState("cardId", parseAsString);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editingCard, setEditingCard] = React.useState<CreditCard | undefined>();
  const language = useAuthSessionStore((state) => state.user?.preferences.language ?? "en");
  const defaultCurrencyCode = useAuthSessionStore(
    (state) => state.household?.settings.defaultCurrencyId ?? "USD",
  );
  const params = useApiParams({
    pagination: true,
    defaultPerPage: 20,
    filters: cardFilterConfigs,
    sorting: {
      fields: cardSortFields,
      defaultField: "name",
      defaultDirection: "asc",
    },
  });
  const cardsQuery = useCreditCardsQuery(params.apiParams as ListCreditCardsQuery);
  const accountsQuery = useAccountsQuery({
    types: ["cash"],
    perPage: MAX_PER_PAGE,
    sort: "name",
    sortDirection: "asc",
  });
  const currenciesQuery = useCurrenciesQuery({ perPage: MAX_PER_PAGE });
  const cards = cardsQuery.data?.data ?? [];
  const selectedCardFromList = cards.find((card) => card.id === cardId);
  const selectedCardQuery = useCreditCardQuery(cardId ?? "", {
    enabled: Boolean(cardId && !selectedCardFromList),
  });
  const selectedCard = selectedCardFromList ?? selectedCardQuery.data;
  const precision =
    currenciesQuery.data?.data.find((currency) => currency.code === selectedCard?.currencyCode)
      ?.precision ?? 2;
  const ownerOptions =
    accountsQuery.data?.data.map((account) => ({
      value: account.id,
      label: account.name,
      description: `${account.institutionName ? `${account.institutionName} · ` : ""}${account.currencyCode}`,
    })) ?? [];

  React.useEffect(() => {
    if (cardsQuery.isPending) return;

    const nextCardId =
      cardId && cards.some((card) => card.id === cardId) ? cardId : (cards[0]?.id ?? null);

    if (nextCardId !== cardId) void setCardId(nextCardId);
  }, [cardId, cards, cardsQuery.isPending, setCardId]);

  const openCreate = React.useCallback(() => {
    setEditingCard(undefined);
    setSheetOpen(true);
  }, []);

  const openEdit = React.useCallback(() => {
    if (!selectedCard) return;
    setEditingCard(selectedCard);
    setSheetOpen(true);
  }, [selectedCard]);

  const pageContent = cardsQuery.isPending ? (
    <CreditCardsLoading />
  ) : cardsQuery.isError ? (
    <ErrorState
      title="Couldn’t load credit cards"
      description={cardsQuery.error.message}
      onRetry={() => void cardsQuery.refetch()}
    />
  ) : cards.length === 0 ? (
    <EmptyState
      icon={<HugeiconsIcon icon={CreditCardIcon} strokeWidth={1.8} />}
      title="No credit cards yet"
      description="Add a card and connect it to one of your cash accounts to start tracking statements and spending."
      action={
        <PermissionButton
          permission={PERMISSIONS.CREDIT_CARDS_CREATE}
          deniedMessage="Your household role cannot create credit cards."
          onClick={openCreate}
        >
          Add credit card
        </PermissionButton>
      }
    />
  ) : (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 pb-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Your cards</CardTitle>
            <CardDescription className="mt-1">
              Select a card to review its balance, statements, and recent activity.
            </CardDescription>
          </div>
          <CreditCardFilters params={params} ownerOptions={ownerOptions} />
        </CardHeader>
        <CardContent>
          <CreditCardCarousel
            cards={cards}
            selectedCardId={selectedCard?.id ?? cards[0].id}
            onSelect={(id) => void setCardId(id)}
          />
        </CardContent>
      </Card>

      {selectedCard ? (
        <SelectedCardWorkspace
          card={selectedCard}
          language={language}
          precision={precision}
          onEdit={openEdit}
        />
      ) : selectedCardQuery.isPending ? (
        <Skeleton className="h-64" aria-label="Loading selected card" />
      ) : selectedCardQuery.isError ? (
        <ErrorState
          title="Couldn’t load the selected card"
          description={selectedCardQuery.error.message}
          onRetry={() => void selectedCardQuery.refetch()}
        />
      ) : null}

      {cardsQuery.data?.meta.pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Page {cardsQuery.data.meta.pagination.page} of{" "}
            {cardsQuery.data.meta.pagination.totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={params.page <= 1}
              onClick={() => params.setPage(params.page - 1)}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={params.page >= cardsQuery.data.meta.pagination.totalPages}
              onClick={() => params.setPage(params.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <InternalPageLayout
      title="Credit cards"
      actions={
        <PermissionButton
          permission={PERMISSIONS.CREDIT_CARDS_CREATE}
          deniedMessage="Your household role cannot create credit cards."
          onClick={openCreate}
        >
          <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
          Add credit card
        </PermissionButton>
      }
    >
      {pageContent}
      <CreditCardSheet
        card={editingCard}
        defaultCurrencyCode={editingCard?.currencyCode ?? defaultCurrencyCode}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </InternalPageLayout>
  );
}
