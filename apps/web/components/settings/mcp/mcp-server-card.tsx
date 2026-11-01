"use client";

import { Refresh01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { McpServerInfo, McpServerStatus } from "@luraba/contracts";
import { ErrorState } from "@/components/error-state";
import { SectionCard, SectionRow } from "@/components/section/section-card";
import { CopyBlock } from "@/components/settings/mcp/copy-block";
import { DataBoundary, LoadingRegion } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMcpServerQuery } from "@/queries/mcp/use-mcp-queries";

const STATUS: Record<McpServerStatus, { label: string; help: string; className: string }> = {
  online: {
    label: "Online",
    help: "The MCP server is reachable and answering.",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
  },
  offline: {
    label: "Offline",
    help: "The MCP server did not answer. Check that it is running (see docs/api-keys-mcp/mcp.md).",
    className: "border-destructive/30 bg-destructive/10 text-destructive",
  },
  disabled: {
    label: "Not configured",
    help: "This deployment has no MCP server. Set MCP_INTERNAL_URL on the API to enable /mcp.",
    className: "text-muted-foreground",
  },
};

function ServerLoading() {
  return (
    <LoadingRegion label="Loading MCP server">
      <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-[3.25rem] w-full sm:w-[28rem]" />
      </div>
      <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-6 w-24" />
      </div>
    </LoadingRegion>
  );
}

function Loaded({
  info,
  onRecheck,
  isFetching,
}: {
  info: McpServerInfo;
  onRecheck: () => void;
  isFetching: boolean;
}) {
  const status = STATUS[info.status];
  return (
    <>
      <SectionRow
        title="Endpoint"
        description="The address to give to an AI client. It follows this site's public URL."
      >
        <CopyBlock value={info.url} label="Copy MCP URL" className="w-full sm:w-[28rem]" />
      </SectionRow>
      <SectionRow title="Status" description={status.help}>
        <Badge variant="outline" className={status.className}>
          {status.label}
        </Badge>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Check status again"
          disabled={isFetching}
          onClick={onRecheck}
        >
          <HugeiconsIcon icon={Refresh01Icon} strokeWidth={2} />
        </Button>
      </SectionRow>
    </>
  );
}

/** Where the MCP server lives and whether it is answering right now (checked every 30 seconds). */
export function McpServerCard() {
  const query = useMcpServerQuery();
  return (
    <SectionCard
      title="MCP server"
      description="Lets AI assistants read and manage your household through the Model Context Protocol."
    >
      <DataBoundary
        isPending={query.isPending}
        isError={query.isError}
        isEmpty={false}
        loading={<ServerLoading />}
        errorState={
          <ErrorState
            title="Couldn't load the MCP server"
            description={query.error?.message}
            onRetry={() => void query.refetch()}
          />
        }
        empty={null}
      >
        {query.data ? (
          <Loaded
            info={query.data}
            isFetching={query.isFetching}
            onRecheck={() => void query.refetch()}
          />
        ) : null}
      </DataBoundary>
    </SectionCard>
  );
}
