"use client";

import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { InvestmentEvent, InvestmentEventType } from "@luraba/contracts";
import { INVESTMENT_EVENT_TYPES } from "@luraba/contracts";
import { keepPreviousData } from "@tanstack/react-query";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import type * as React from "react";

import { getInvestmentEventTypeLabel } from "@/components/display";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { ConfirmDeleteModal } from "@/components/investments/confirm-delete-modal";
import { EventsTable } from "@/components/investments/events-table";
import { CashMovementSheet } from "@/components/investments/forms/cash-movement-sheet";
import { EventSheet } from "@/components/investments/forms/event-sheet";
import { PaginationBar } from "@/components/investments/pagination-bar";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useDisclosure, useEntityDisclosure } from "@/hooks/use-disclosure";
import { useDeleteInvestmentEventMutation } from "@/mutations/investments/use-investments-mutations";
import {
  useInvestmentAccountsQuery,
  useInvestmentEventsQuery,
} from "@/queries/investments/use-investments-queries";

const ALL = "all";
const PER_PAGE = 50;

export default function InvestmentTransactionsPage() {
  const [filters, setFilters] = useQueryStates({
    accountId: parseAsString,
    type: parseAsString,
    page: parseAsInteger.withDefault(1),
  });
  const accounts = useInvestmentAccountsQuery();
  const events = useInvestmentEventsQuery(
    {
      accountId: filters.accountId ?? undefined,
      type: (filters.type as InvestmentEventType | null) ?? undefined,
      page: filters.page,
      perPage: PER_PAGE,
    },
    { placeholderData: keepPreviousData },
  );
  const sheet = useEntityDisclosure<InvestmentEvent>();
  const cashSheet = useDisclosure();
  const remove = useEntityDisclosure<InvestmentEvent>();
  const deleteMutation = useDeleteInvestmentEventMutation({
    successToast: { title: "Transaction deleted" },
    onSuccess: () => remove.onClose(),
  });

  let content: React.ReactNode;
  if (events.isPending) {
    content = <Skeleton className="h-72 rounded-xl bg-muted/50" />;
  } else if (events.isError) {
    content = (
      <ErrorState
        title="Couldn't load transactions"
        description={events.error.message}
        onRetry={() => void events.refetch()}
      />
    );
  } else if (events.data.data.length === 0) {
    content = (
      <EmptyState
        title="No transactions yet"
        description="Record a buy, a dividend or a deposit, or import a broker statement."
      />
    );
  } else {
    const pagination = events.data.meta.pagination;
    content = (
      <div className="space-y-3">
        <EventsTable
          events={events.data.data}
          onEdit={(event) => sheet.onEdit(event)}
          onDelete={(event) => remove.onEdit(event)}
        />
        {pagination ? (
          <PaginationBar
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalCount={pagination.totalCount}
            itemLabel="transactions"
            onPageChange={(page) => void setFilters({ page })}
          />
        ) : null}
      </div>
    );
  }

  return (
    <InternalPageLayout
      title="Transactions"
      subtitle="Every buy, sale, income payment and corporate action in your ledger."
      actions={
        <div className="flex items-center gap-2">
          <PermissionButton
            permission={PERMISSIONS.INVESTMENTS_WRITE}
            variant="outline"
            onClick={() => cashSheet.onOpen()}
          >
            Cash movement
          </PermissionButton>
          <PermissionButton
            permission={PERMISSIONS.INVESTMENTS_WRITE}
            onClick={() => sheet.onCreate()}
          >
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
            New transaction
          </PermissionButton>
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={filters.accountId ?? ALL}
          onValueChange={(value) =>
            void setFilters({ accountId: value === ALL ? null : value, page: 1 })
          }
        >
          <SelectTrigger className="w-52" aria-label="Account">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All accounts</SelectItem>
            {(accounts.data ?? []).map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.type ?? ALL}
          onValueChange={(value) =>
            void setFilters({ type: value === ALL ? null : value, page: 1 })
          }
        >
          <SelectTrigger className="w-52" aria-label="Transaction type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All types</SelectItem>
            {INVESTMENT_EVENT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {getInvestmentEventTypeLabel(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {content}
      <EventSheet
        open={sheet.isOpen}
        onOpenChange={sheet.setIsOpen}
        event={sheet.entity}
        seed={filters.accountId ? { accountId: filters.accountId } : undefined}
      />
      <CashMovementSheet
        open={cashSheet.isOpen}
        onOpenChange={cashSheet.setIsOpen}
        accountId={filters.accountId ?? undefined}
      />
      <ConfirmDeleteModal
        open={remove.isOpen}
        onOpenChange={remove.setIsOpen}
        title="Delete transaction?"
        description="Positions, cost and taxes will be recalculated without it."
        confirmLabel="Delete transaction"
        isLoading={deleteMutation.isPending}
        errorMessage={deleteMutation.errorMessage}
        onConfirm={() => remove.entity && deleteMutation.mutate(remove.entity.id)}
      />
    </InternalPageLayout>
  );
}
