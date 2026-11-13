"use client";

import { Copy01Icon, Delete02Icon, Mail01Icon, Refresh01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { HouseholdInvite, HouseholdRole, ListHouseholdInvitesQuery } from "@luraba/contracts";
import { formatDate } from "@luraba/domain";
import { useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import * as React from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { MemberMark } from "@/components/display";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import type { FilterFieldDef } from "@/components/filters";
import { useFilters } from "@/components/filters/use-filters";
import { HouseholdTableToolbar } from "@/components/households/household-table-toolbar";
import type { MobileRowConfig } from "@/components/lists/mobile-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserDisplay } from "@/components/users/user-display";
import { useApiParams } from "@/hooks/use-api-params";
import { useDataTable } from "@/hooks/use-data-table";
import {
  canManageHousehold,
  getHouseholdInviteStatusClassName,
  getHouseholdInviteStatusLabel,
  getHouseholdRoleLabel,
} from "@/lib/households";
import { cn } from "@/lib/utils";
import {
  useCancelHouseholdInviteMutation,
  useRefreshHouseholdInviteLinkMutation,
  useResendHouseholdInviteMutation,
} from "@/mutations/households/use-household-mutations";
import {
  householdInviteQueryKeys,
  useHouseholdInvitesQuery,
} from "@/queries/households/use-household-invite-query";
import {
  useHouseholdInviteStatusesQuery,
  useHouseholdRolesQuery,
} from "@/queries/households/use-households-query";

const INVITE_FILTER_IDS = ["roles", "statuses"] as const;

export function HouseholdInvitationsTable({
  householdId,
  householdRole,
}: {
  householdId: string;
  householdRole: HouseholdRole;
}) {
  const client = useQueryClient();
  const params = useApiParams({
    keyPrefix: "invitations",
    pagination: true,
    defaultPerPage: 20,
    sorting: {
      fields: ["email", "role", "createdAt", "expiresAt", "status"] as const,
      defaultField: "createdAt",
      defaultDirection: "desc",
    },
  });
  const filters = useFilters({
    fieldIds: INVITE_FILTER_IDS,
    keyPrefix: "invitations",
    defaultRules: [["statuses", "is_any_of", ["pending"]]],
  });
  const apiParams = React.useMemo(
    () => ({
      ...params.apiParams,
      ...(filters.values.list("roles").length > 0 ? { roles: filters.values.list("roles") } : {}),
      ...(filters.values.list("statuses").length > 0
        ? { statuses: filters.values.list("statuses") }
        : {}),
    }),
    [params.apiParams, filters.values],
  );
  const query = useHouseholdInvitesQuery(householdId, apiParams as ListHouseholdInvitesQuery);
  const rolesQuery = useHouseholdRolesQuery();
  const statusesQuery = useHouseholdInviteStatusesQuery();
  const roles = rolesQuery.data ?? [];
  const statuses = statusesQuery.data ?? [];
  const roleOptions = React.useMemo(() => roles.filter((role) => role.canBeInvited), [roles]);
  const filterDefs = React.useMemo<FilterFieldDef[]>(
    () => [
      {
        id: "roles",
        label: "Role",
        kind: "multiselect",
        options: roleOptions.map((role) => ({ value: role.value, label: role.label })),
      },
      {
        id: "statuses",
        label: "Status",
        kind: "multiselect",
        options: statuses.map((status) => ({ value: status.value, label: status.label })),
      },
    ],
    [roleOptions, statuses],
  );
  const [pendingAction, setPendingAction] = React.useState<{
    type: "cancel" | "resend";
    invite: HouseholdInvite;
  } | null>(null);
  const createLink = useRefreshHouseholdInviteLinkMutation({
    onSuccess: async (link) => {
      try {
        await navigator.clipboard.writeText(link.url);
        toast.success("Invitation link copied", {
          description: "The previous link was rotated and is no longer valid.",
        });
      } catch {
        toast.error("Could not copy the invitation link", {
          description: "The link was refreshed. Try copying it again from your browser.",
        });
      }
      await client.invalidateQueries({
        queryKey: householdInviteQueryKeys.lists(),
      });
    },
  });
  const resend = useResendHouseholdInviteMutation({
    onSuccess: async () => {
      setPendingAction(null);
      toast.success("Invitation resent", {
        description: "The invitation expiration was refreshed.",
      });
      await client.invalidateQueries({
        queryKey: householdInviteQueryKeys.lists(),
      });
    },
  });
  const cancel = useCancelHouseholdInviteMutation({
    onSuccess: async () => {
      setPendingAction(null);
      toast.success("Invitation canceled");
      await client.invalidateQueries({
        queryKey: householdInviteQueryKeys.lists(),
      });
    },
  });
  const canManage = canManageHousehold(householdRole, roles);
  const columns = React.useMemo<ColumnDef<HouseholdInvite>[]>(
    () => [
      {
        accessorKey: "email",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Recipient" />,
        cell: ({ row }) => (
          <UserDisplay
            compact
            user={{
              name: row.original.email,
              email: "Invitation recipient",
            }}
          />
        ),
        enableSorting: true,
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => (
          <Badge variant="outline">{getHouseholdRoleLabel(row.original.role, roles)}</Badge>
        ),
        enableSorting: true,
      },
      {
        id: "inviter",
        header: "Invited by",
        cell: ({ row }) =>
          row.original.inviter ? (
            <UserDisplay compact user={row.original.inviter} />
          ) : (
            <span className="text-sm text-muted-foreground">Household admin</span>
          ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Status" />,
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={cn(getHouseholdInviteStatusClassName(row.original.computedStatus))}
          >
            {getHouseholdInviteStatusLabel(row.original.computedStatus, statuses)}
          </Badge>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => <DataTableColumnHeader column={column} label="Invited" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{formatDate(row.original.createdAt)}</span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "expiresAt",
        header: "Expires",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{formatDate(row.original.expiresAt)}</span>
        ),
        enableSorting: true,
      },
      {
        id: "actions",
        header: "",
        enableHiding: false,
        cell: ({ row }) => {
          const invite = row.original;
          const actionable =
            canManage &&
            (invite.computedStatus === "pending" || invite.computedStatus === "expired");
          return (
            <div className="flex justify-end gap-1" data-row-action>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={!actionable || createLink.isPending}
                title="Copy invitation link"
                onClick={() => createLink.mutate({ householdId, inviteId: invite.id })}
              >
                <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={!actionable}
                title="Refresh the link and resend this invitation"
                onClick={() => setPendingAction({ type: "resend", invite })}
              >
                <HugeiconsIcon icon={Refresh01Icon} strokeWidth={2} />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={!actionable}
                title="Cancel invitation"
                onClick={() => setPendingAction({ type: "cancel", invite })}
              >
                <HugeiconsIcon icon={Delete02Icon} className="text-destructive" strokeWidth={2} />
              </Button>
            </div>
          );
        },
      },
    ],
    [canManage, createLink, householdId, roles, statuses],
  );
  const rows = query.data?.data ?? [];
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
        field as "email" | "role" | "createdAt" | "expiresAt" | "status",
        direction,
      ),
    getRowId: (row) => row.id,
  });

  const mobile = React.useMemo<MobileRowConfig<HouseholdInvite>>(
    () => ({
      row: (invite) => {
        const actionable =
          canManage && (invite.computedStatus === "pending" || invite.computedStatus === "expired");
        return {
          leading: <MemberMark member={{ name: invite.email, image: null }} size="md" />,
          title: invite.email,
          subtitle: `${getHouseholdRoleLabel(invite.role, roles)} · ${getHouseholdInviteStatusLabel(invite.computedStatus, statuses)} · Expires ${formatDate(invite.expiresAt)}`,
          actions: actionable ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                disabled={createLink.isPending}
                aria-label="Copy invitation link"
                onClick={() => createLink.mutate({ householdId, inviteId: invite.id })}
              >
                <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Cancel invitation"
                onClick={() => setPendingAction({ type: "cancel", invite })}
              >
                <HugeiconsIcon icon={Delete02Icon} className="text-destructive" strokeWidth={2} />
              </Button>
            </>
          ) : null,
        };
      },
    }),
    [canManage, createLink, householdId, roles, statuses],
  );

  return (
    <div className="space-y-3">
      <HouseholdTableToolbar
        table={table}
        search={params.search}
        onSearchChange={params.setSearch}
        defs={filterDefs}
        filters={filters}
        placeholder="Search invitations..."
      />
      {query.isPending ? (
        <div className="h-48 animate-pulse rounded-lg bg-muted" />
      ) : query.isError ? (
        <ErrorState
          title="Couldn't load invitations"
          description={query.error.message}
          onRetry={() => void query.refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No invitations"
          description="Outgoing invitations and their lifecycle status appear here."
          icon={<HugeiconsIcon icon={Mail01Icon} strokeWidth={1.8} />}
        />
      ) : (
        <DataTable
          table={table}
          mobile={mobile}
          totalCount={query.data?.meta.pagination.totalCount}
          itemLabel="invitation"
          pageSizeOptions={[10, 20, 50, 100]}
        />
      )}
      <Dialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingAction?.type === "resend"
                ? "Refresh and resend invitation?"
                : "Cancel invitation?"}
            </DialogTitle>
            <DialogDescription>
              {pendingAction?.type === "resend"
                ? "This rotates the secure link, invalidates the previous link, and gives the recipient a fresh seven days to join."
                : "The recipient will no longer be able to use this invitation link. This keeps the invitation in your history as canceled."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingAction(null)}>
              Keep invitation
            </Button>
            <Button
              variant={pendingAction?.type === "cancel" ? "destructive" : "default"}
              isLoading={resend.isPending || cancel.isPending}
              loadingText={pendingAction?.type === "resend" ? "Refreshing..." : "Canceling..."}
              onClick={() => {
                if (!pendingAction) return;
                const variables = {
                  householdId,
                  inviteId: pendingAction.invite.id,
                };
                if (pendingAction.type === "resend") resend.mutate(variables);
                else cancel.mutate(variables);
              }}
            >
              {pendingAction?.type === "resend" ? "Refresh and resend" : "Cancel invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
