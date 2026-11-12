"use client";

import { Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ApiKey } from "@luraba/contracts";
import { formatDate } from "@luraba/domain";
import { useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import * as React from "react";
import { DataTable } from "@/components/data-table/data-table";
import type { MobileRowConfig } from "@/components/lists/mobile-list";
import { ApiKeyNameCell } from "@/components/settings/api-keys/api-key-name-cell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useDataTable } from "@/hooks/use-data-table";
import { API_KEY_STATUS_BADGE_CLASSES, API_KEY_STATUS_LABELS } from "@/lib/api-keys";
import { useUpdateApiKeyMutation } from "@/mutations/api-keys/use-api-key-mutations";
import { apiKeyQueryKeys } from "@/queries/api-keys/use-api-keys-query";

const NEVER = "Never";

export function ApiKeysTable({
  keys,
  onDelete,
}: {
  keys: ApiKey[];
  onDelete: (apiKey: ApiKey) => void;
}) {
  const client = useQueryClient();
  const update = useUpdateApiKeyMutation({
    onSuccess: () => client.invalidateQueries({ queryKey: apiKeyQueryKeys.lists() }),
  });

  const columns = React.useMemo<ColumnDef<ApiKey>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Label",
        cell: ({ row }) => (
          <ApiKeyNameCell
            name={row.original.name}
            onRename={(name) => update.mutate({ id: row.original.id, body: { name } })}
          />
        ),
      },
      {
        accessorKey: "prefix",
        header: "Key",
        cell: ({ row }) => (
          <code className="font-mono text-muted-foreground">{row.original.prefix}...</code>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{formatDate(row.original.createdAt)}</span>
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
        accessorKey: "expiresAt",
        header: "Expires",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.expiresAt ? formatDate(row.original.expiresAt) : NEVER}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={API_KEY_STATUS_BADGE_CLASSES[row.original.status]}>
              {API_KEY_STATUS_LABELS[row.original.status]}
            </Badge>
            {row.original.status !== "expired" ? (
              <Switch
                aria-label={row.original.enabled ? "Revoke key" : "Enable key"}
                checked={row.original.enabled}
                disabled={update.isPending}
                onCheckedChange={(enabled) =>
                  update.mutate({ id: row.original.id, body: { enabled } })
                }
              />
            ) : null}
          </div>
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
              size="icon-sm"
              title="Delete key"
              aria-label={`Delete ${row.original.name}`}
              onClick={() => onDelete(row.original)}
            >
              <HugeiconsIcon icon={Delete02Icon} className="text-destructive" strokeWidth={2} />
            </Button>
          </div>
        ),
      },
    ],
    [onDelete, update],
  );

  const { table } = useDataTable({
    data: keys,
    columns,
    page: 1,
    perPage: Math.max(keys.length, 1),
    pageCount: 1,
    sort: undefined,
    onPageChange: () => undefined,
    onPerPageChange: () => undefined,
    onSortChange: () => undefined,
    getRowId: (row) => row.id,
  });

  const mobile = React.useMemo<MobileRowConfig<ApiKey>>(
    () => ({
      row: (apiKey) => ({
        title: (
          <ApiKeyNameCell
            name={apiKey.name}
            onRename={(name) => update.mutate({ id: apiKey.id, body: { name } })}
          />
        ),
        subtitle: `${apiKey.prefix}... · ${API_KEY_STATUS_LABELS[apiKey.status]} · Used ${apiKey.lastUsedAt ? formatDate(apiKey.lastUsedAt) : NEVER.toLowerCase()}`,
        actions: (
          <>
            {apiKey.status !== "expired" ? (
              <Switch
                aria-label={apiKey.enabled ? "Revoke key" : "Enable key"}
                checked={apiKey.enabled}
                disabled={update.isPending}
                onCheckedChange={(enabled) => update.mutate({ id: apiKey.id, body: { enabled } })}
              />
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Delete ${apiKey.name}`}
              onClick={() => onDelete(apiKey)}
            >
              <HugeiconsIcon icon={Delete02Icon} className="text-destructive" strokeWidth={2} />
            </Button>
          </>
        ),
      }),
    }),
    [onDelete, update],
  );

  return <DataTable table={table} mobile={mobile} showPagination={false} itemLabel="key" />;
}
