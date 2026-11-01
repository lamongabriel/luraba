"use client";

import { Delete02Icon, RoboticIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { McpConnection } from "@luraba/contracts";
import { formatDate } from "@luraba/domain";
import { useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import * as React from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table/data-table";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { SectionCard } from "@/components/section/section-card";
import { DataBoundary, TableSkeleton } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Modal, ModalContent, ModalFooter } from "@/components/ui/modal";
import { useDataTable } from "@/hooks/use-data-table";
import { useRevokeMcpConnectionMutation } from "@/mutations/mcp/use-mcp-mutations";
import {
  mcpQueryKeys,
  useMcpConnectionsQuery,
  useMcpServerQuery,
} from "@/queries/mcp/use-mcp-queries";

const NEVER = "Not yet";
const COLUMN_COUNT = 4;

function ConnectionsTable({
  connections,
  onRevoke,
}: {
  connections: McpConnection[];
  onRevoke: (connection: McpConnection) => void;
}) {
  const columns = React.useMemo<ColumnDef<McpConnection>[]>(
    () => [
      { accessorKey: "name", header: "Agent" },
      {
        accessorKey: "grantedAt",
        header: "Allowed",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{formatDate(row.original.grantedAt)}</span>
        ),
      },
      {
        accessorKey: "lastUsedAt",
        header: "Last used",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.lastUsedAt ? formatDate(row.original.lastUsedAt) : NEVER}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex justify-end" data-row-action>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Revoke ${row.original.name}`}
              onClick={() => onRevoke(row.original)}
            >
              <HugeiconsIcon icon={Delete02Icon} className="text-destructive" strokeWidth={2} />
              Revoke
            </Button>
          </div>
        ),
      },
    ],
    [onRevoke],
  );
  const { table } = useDataTable({
    data: connections,
    columns,
    page: 1,
    perPage: Math.max(connections.length, 1),
    pageCount: 1,
    sort: undefined,
    onPageChange: () => undefined,
    onPerPageChange: () => undefined,
    onSortChange: () => undefined,
    getRowId: (row) => row.clientId,
  });
  return <DataTable table={table} showPagination={false} itemLabel="agent" />;
}

/** The agents you allowed through OAuth, with a Revoke button. */
export function McpConnectionsCard() {
  const client = useQueryClient();
  const query = useMcpConnectionsQuery();
  const server = useMcpServerQuery();
  const disabled = server.data?.status === "disabled";
  const [revoking, setRevoking] = React.useState<McpConnection | null>(null);
  const revoke = useRevokeMcpConnectionMutation({
    onSuccess: async () => {
      setRevoking(null);
      toast.success("Agent revoked");
      await client.invalidateQueries({ queryKey: mcpQueryKeys.connections() });
    },
  });
  const connections = query.data ?? [];

  return (
    <>
      <SectionCard
        title="Connected agents"
        description="Agents you allowed to use Luraba as you through a sign-in. Revoke one and it loses access right away."
      >
        <DataBoundary
          isPending={query.isPending}
          isError={query.isError}
          isEmpty={connections.length === 0}
          loading={
            <TableSkeleton columns={COLUMN_COUNT} rows={2} label="Loading connected agents" />
          }
          errorState={
            <ErrorState
              title="Couldn't load connected agents"
              description={query.error?.message}
              onRetry={() => void query.refetch()}
            />
          }
          empty={
            <EmptyState
              icon={<HugeiconsIcon icon={RoboticIcon} strokeWidth={1.8} className="size-5" />}
              title={disabled ? "MCP is not enabled on this deployment" : "No connected agents"}
              description={
                disabled
                  ? "Set MCP_INTERNAL_URL on the API (and run the mcp service) to let AI clients connect."
                  : "When you connect an AI client with the OAuth sign-in, it shows up here."
              }
            />
          }
        >
          <ConnectionsTable connections={connections} onRevoke={setRevoking} />
        </DataBoundary>
      </SectionCard>
      <Modal open={revoking !== null} onOpenChange={(open) => !open && setRevoking(null)}>
        <ModalContent
          variant="destructive"
          title={`Revoke ${revoking?.name ?? "this agent"}?`}
          description="It stops working right away and has to ask for your permission again to reconnect."
          isLoading={revoke.isPending}
          size="sm"
        >
          <ModalFooter
            cancelLabel="Cancel"
            confirmLabel="Revoke access"
            confirmVariant="destructive"
            isLoading={revoke.isPending}
            loadingLabel="Revoking..."
            onConfirm={() => revoking && revoke.mutate(revoking.clientId)}
          />
        </ModalContent>
      </Modal>
    </>
  );
}
