"use client"

import { Delete02Icon, UserGroupIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type {
  HouseholdMember,
  HouseholdRole,
  ListHouseholdMembersQuery,
} from "@luraba/contracts"
import { useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import * as React from "react"
import { DataTable } from "@/components/data-table/data-table"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { EmptyState } from "@/components/empty-state"
import { ErrorState } from "@/components/error-state"
import { FilterFaceted } from "@/components/filters/filter-faceted"
import { HouseholdTableToolbar } from "@/components/households/household-table-toolbar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  householdMemberToUserDisplay,
  UserDisplay,
} from "@/components/users/user-display"
import { useApiParams } from "@/hooks/use-api-params"
import { useDataTable } from "@/hooks/use-data-table"
import { formatDate } from "@/lib/format"
import { canManageHousehold } from "@/lib/households"
import {
  useRemoveHouseholdMemberMutation,
  useUpdateHouseholdMemberMutation,
} from "@/mutations/households/use-household-mutations"
import {
  householdQueryKeys,
  useHouseholdMembersQuery,
  useHouseholdRolesQuery,
} from "@/queries/households/use-households-query"
import { useAuthSessionStore } from "@/stores/auth-session-store"

export function HouseholdMembersTable({
  householdId,
  householdRole,
}: {
  householdId: string
  householdRole: HouseholdRole
}) {
  const client = useQueryClient()
  const currentUserId = useAuthSessionStore((state) => state.user?.id)
  const params = useApiParams({
    keyPrefix: "members",
    pagination: true,
    defaultPerPage: 20,
    sorting: {
      fields: ["name", "email", "role", "createdAt", "lastActiveAt"] as const,
      defaultField: "name",
    },
    filters: {
      roles: { type: "stringArray" },
      emailVerified: { type: "boolean" },
    },
  })
  const query = useHouseholdMembersQuery(
    householdId,
    params.apiParams as ListHouseholdMembersQuery,
  )
  const rolesQuery = useHouseholdRolesQuery()
  const roles = rolesQuery.data ?? []
  const roleOptions = roles
  const update = useUpdateHouseholdMemberMutation({
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: householdQueryKeys.members(householdId),
      }),
  })
  const remove = useRemoveHouseholdMemberMutation({
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: householdQueryKeys.members(householdId),
      }),
  })
  const manager = canManageHousehold(householdRole, roles)
  const columns = React.useMemo<ColumnDef<HouseholdMember>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Member" />
        ),
        cell: ({ row }) => (
          <UserDisplay user={householdMemberToUserDisplay(row.original)} />
        ),
        enableSorting: true,
      },
      {
        accessorKey: "emailVerified",
        header: "Email verification",
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={
              row.original.emailVerified
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                : "text-muted-foreground"
            }
          >
            {row.original.emailVerified ? "Verified" : "Not verified"}
          </Badge>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "role",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Role" />
        ),
        cell: ({ row }) => (
          <Select
            disabled={!manager || row.original.userId === currentUserId}
            value={row.original.role}
            onValueChange={(value) =>
              update.mutate({
                householdId,
                userId: row.original.userId,
                body: { role: value as HouseholdRole },
              })
            }
          >
            <SelectTrigger
              title={
                row.original.userId === currentUserId
                  ? "You cannot change your own role here"
                  : undefined
              }
              className="h-7 w-28"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roleOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Member since" />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "lastActiveAt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Last active" />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.lastActiveAt
              ? formatDate(row.original.lastActiveAt)
              : "Never"}
          </span>
        ),
        enableSorting: true,
      },
      {
        id: "actions",
        header: "",
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex justify-end" data-row-action>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={!manager || row.original.userId === currentUserId}
              title={
                row.original.userId === currentUserId
                  ? "You cannot remove yourself"
                  : "Remove member"
              }
              onClick={() =>
                remove.mutate({ householdId, userId: row.original.userId })
              }
            >
              <HugeiconsIcon
                icon={Delete02Icon}
                className="text-destructive"
                strokeWidth={2}
              />
            </Button>
          </div>
        ),
      },
    ],
    [currentUserId, householdId, manager, remove, roleOptions, update],
  )
  const rows = query.data?.data ?? []
  const { table } = useDataTable({
    data: rows,
    columns,
    page: params.page,
    perPage: params.perPage,
    pageCount: query.data?.meta.pagination.totalPages ?? 0,
    sort: params.sort,
    sortDirection: params.sortDirection,
    onPageChange: params.setPage,
    onPerPageChange: params.setPerPage,
    onSortChange: (field, direction) =>
      params.setSorting(
        field as "name" | "email" | "role" | "createdAt" | "lastActiveAt",
        direction,
      ),
    getRowId: (row) => row.id,
  })

  return (
    <div className="space-y-3">
      <HouseholdTableToolbar
        table={table}
        search={params.search}
        onSearchChange={params.setSearch}
        role={params.filters.roles?.[0]}
        onRoleChange={(value) =>
          params.setFilter("roles", value ? [value] : null)
        }
        roleOptions={roleOptions}
        onClear={params.clearFilters}
        hasFilters={params.hasFilters}
        placeholder="Search members..."
      >
        <FilterFaceted
          title="Email"
          value={
            params.filters.emailVerified === null
              ? undefined
              : params.filters.emailVerified
                ? "verified"
                : "unverified"
          }
          options={[
            { value: "verified", label: "Verified" },
            { value: "unverified", label: "Not verified" },
          ]}
          onValueChange={(value) =>
            params.setFilter(
              "emailVerified",
              value === "verified"
                ? true
                : value === "unverified"
                  ? false
                  : null,
            )
          }
        />
      </HouseholdTableToolbar>
      {query.isPending ? (
        <div className="h-48 animate-pulse rounded-lg bg-muted" />
      ) : query.isError ? (
        <ErrorState
          title="Couldn't load members"
          description={query.error.message}
          onRetry={() => void query.refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title={params.hasFilters ? "No matching members" : "No members yet"}
          description="Members with access to this household appear here."
          icon={<HugeiconsIcon icon={UserGroupIcon} strokeWidth={1.8} />}
        />
      ) : (
        <DataTable
          table={table}
          totalCount={query.data?.meta.pagination.totalCount}
          itemLabel="member"
          pageSizeOptions={[10, 20, 50, 100]}
        />
      )}
    </div>
  )
}
