"use client";

import { Add01Icon, ArrowRight01Icon, Edit02Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type {
  CreateHouseholdInput,
  HouseholdSummary,
  ListHouseholdsQuery,
} from "@luraba/contracts";
import { PERMISSIONS } from "@luraba/contracts";
import { useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import * as React from "react";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/finance/page-header";
import { HouseholdSettingsSheet } from "@/components/households/household-settings-sheet";
import { HouseholdTableToolbar } from "@/components/households/household-table-toolbar";
import { PageReveal } from "@/components/motion/reveal";
import { useCan } from "@/components/permissions/use-can";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApiParams } from "@/hooks/use-api-params";
import { useDataTable } from "@/hooks/use-data-table";
import { formatDate } from "@/lib/format";
import { getHouseholdRoleLabel } from "@/lib/households";
import { formatTimezoneLabel } from "@/lib/timezones";
import {
  useCreateHouseholdMutation,
  useUpdateHouseholdMutation,
} from "@/mutations/households/use-household-mutations";
import {
  householdQueryKeys,
  useHouseholdRolesQuery,
  useHouseholdsQuery,
} from "@/queries/households/use-households-query";
import { useAuthSessionStore } from "@/stores/auth-session-store";

function HouseholdIdentity({
  household,
  isCurrent,
}: {
  household: HouseholdSummary;
  isCurrent: boolean;
}) {
  return (
    <div className="flex min-w-56 items-center gap-3">
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          {isCurrent ? (
            <Badge variant="secondary" className="h-5 shrink-0 gap-1 px-1.5">
              <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} />
              Current
            </Badge>
          ) : null}
          <span className="truncate font-medium">{household.name}</span>
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {household.description || "No description"}
        </span>
      </span>
    </div>
  );
}

export function HouseholdsDirectory() {
  const queryClient = useQueryClient();
  const activeHouseholdId = useAuthSessionStore((state) => state.activeHouseholdId);
  const can = useCan();
  const params = useApiParams({
    pagination: true,
    defaultPerPage: 20,
    sorting: {
      fields: ["name", "createdAt", "updatedAt"] as const,
      defaultField: "name",
    },
    filters: { roles: { type: "stringArray" } },
  });
  const query = useHouseholdsQuery(params.apiParams as ListHouseholdsQuery);
  const rolesQuery = useHouseholdRolesQuery();
  const roles = rolesQuery.data ?? [];
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [settingsMode, setSettingsMode] = React.useState<"create" | "edit">("create");
  const [editing, setEditing] = React.useState<HouseholdSummary | null>(null);

  const createMutation = useCreateHouseholdMutation({
    onSuccess: async () => {
      setSettingsOpen(false);
      await queryClient.invalidateQueries({ queryKey: householdQueryKeys.all });
    },
  });
  const updateMutation = useUpdateHouseholdMutation({
    onSuccess: async () => {
      setSettingsOpen(false);
      await queryClient.invalidateQueries({ queryKey: householdQueryKeys.all });
    },
  });
  const columns = React.useMemo<ColumnDef<HouseholdSummary>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Household" />,
        cell: ({ row }) => (
          <HouseholdIdentity
            household={row.original}
            isCurrent={row.original.id === activeHouseholdId}
          />
        ),
        enableSorting: true,
      },
      {
        accessorKey: "role",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Your role" />,
        cell: ({ row }) => (
          <Badge variant="outline">{getHouseholdRoleLabel(row.original.role, roles)}</Badge>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "defaultCurrencyId",
        header: "Currency",
        cell: ({ row }) => <span className="font-medium">{row.original.defaultCurrencyId}</span>,
      },
      {
        accessorKey: "timezone",
        header: "Timezone",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatTimezoneLabel(row.original.timezone)}
          </span>
        ),
      },
      {
        accessorKey: "updatedAt",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Updated" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{formatDate(row.original.updatedAt)}</span>
        ),
        enableSorting: true,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const household = row.original;
          return (
            <div className="flex justify-end gap-1" data-row-action>
              <Button asChild variant="ghost" size="sm" className="gap-1.5">
                <Link href={`/households/${household.id}`}>
                  Details
                  <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
                </Link>
              </Button>
              {household.role === "owner" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    setEditing(household);
                    setSettingsMode("edit");
                    setSettingsOpen(true);
                  }}
                >
                  <HugeiconsIcon icon={Edit02Icon} strokeWidth={2} />
                  Edit
                </Button>
              ) : null}
            </div>
          );
        },
      },
    ],
    [activeHouseholdId, roles],
  );

  const rows = query.data?.data ?? [];
  const pagination = query.data?.meta.pagination;
  const hasFilters = params.hasFilters;
  const { table } = useDataTable({
    data: rows,
    columns,
    page: params.page,
    perPage: params.perPage,
    pageCount: pagination?.totalPages ?? 0,
    sort: params.sort,
    sortDirection: params.sortDirection,
    onPageChange: params.setPage,
    onPerPageChange: params.setPerPage,
    onSortChange: (field, direction) =>
      params.setSorting(field as "name" | "createdAt" | "updatedAt", direction),
    getRowId: (row) => row.id,
  });

  function saveHousehold(body: CreateHouseholdInput) {
    if (settingsMode === "create") createMutation.mutate(body);
    else if (editing) updateMutation.mutate({ householdId: editing.id, body });
  }

  const header = (
    <PageHeader
      title="Households"
      actions={
        can(PERMISSIONS.HOUSEHOLD_READ) ? (
          <Button
            onClick={() => {
              setEditing(null);
              setSettingsMode("create");
              setSettingsOpen(true);
            }}
          >
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} /> New household
          </Button>
        ) : null
      }
    />
  );

  if (query.isPending)
    return (
      <PageReveal className="min-w-0 max-w-full space-y-10">
        {header}
        <div className="space-y-3">
          <div className="h-7 animate-pulse rounded-lg bg-muted" />
          <div className="h-72 animate-pulse rounded-lg bg-muted" />
        </div>
      </PageReveal>
    );
  if (query.isError)
    return (
      <PageReveal className="min-w-0 max-w-full space-y-10">
        {header}
        <ErrorState
          title="Couldn't load households"
          description={query.error.message}
          onRetry={() => void query.refetch()}
        />
      </PageReveal>
    );

  return (
    <PageReveal className="min-w-0 max-w-full space-y-10">
      {header}
      <div className="space-y-5">
        <HouseholdTableToolbar
          table={table}
          search={params.search}
          onSearchChange={params.setSearch}
          role={params.filters.roles?.[0]}
          onRoleChange={(value) => params.setFilter("roles", value ? [value] : null)}
          roleOptions={roles}
          onClear={params.clearFilters}
          hasFilters={hasFilters}
          placeholder="Search households..."
        />
        {rows.length === 0 ? (
          <EmptyState
            title={hasFilters ? "No matching households" : "No households yet"}
            description={
              hasFilters
                ? "Try changing your search or filters."
                : "Create a household to organize your finances and invite people."
            }
            action={
              !hasFilters ? (
                <Button
                  onClick={() => {
                    setEditing(null);
                    setSettingsMode("create");
                    setSettingsOpen(true);
                  }}
                >
                  <HugeiconsIcon icon={Add01Icon} strokeWidth={2} /> Create household
                </Button>
              ) : undefined
            }
            icon={<HugeiconsIcon icon={Tick02Icon} strokeWidth={1.8} />}
          />
        ) : (
          <DataTable
            table={table}
            totalCount={pagination?.totalCount}
            itemLabel="household"
            pageSizeOptions={[10, 20, 50, 100]}
          />
        )}
      </div>
      <HouseholdSettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        household={editing}
        mode={settingsMode}
        onSubmit={saveHousehold}
        isPending={createMutation.isPending || updateMutation.isPending}
      />
    </PageReveal>
  );
}
