"use client";

import Link from "next/link";
import * as React from "react";
import { ErrorState } from "@/components/error-state";
import { SectionBlock, SectionCard } from "@/components/section/section-card";
import { CopyBlock } from "@/components/settings/mcp/copy-block";
import { DataBoundary, LoadingRegion } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import {
  buildMcpSnippets,
  MCP_CLIENTS,
  type McpAuthMethod,
  type McpClientId,
} from "@/lib/mcp-snippets";
import { useMcpServerQuery } from "@/queries/mcp/use-mcp-queries";

const METHODS: readonly { id: McpAuthMethod; label: string }[] = [
  { id: "oauth", label: "Sign in (OAuth)" },
  { id: "api-key", label: "API key" },
];

function ConnectLoading() {
  return (
    <LoadingRegion label="Loading setup">
      <div className="space-y-4">
        <Skeleton className="h-8 w-full max-w-xl" />
        <Skeleton className="h-8 w-60" />
        <Skeleton className="h-5 w-72" />
        <Skeleton className="h-[3.25rem] w-full" />
      </div>
    </LoadingRegion>
  );
}

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { id: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="flex flex-wrap gap-1.5" aria-label={label}>
      {options.map((option) => (
        <Button
          key={option.id}
          type="button"
          size="sm"
          variant={option.id === value ? "default" : "outline"}
          aria-pressed={option.id === value}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </Button>
      ))}
    </fieldset>
  );
}

/** Copy-paste setup for Claude Code, Claude Desktop, Codex and any other MCP client. */
export function McpConnectCard() {
  const query = useMcpServerQuery();
  const [client, setClient] = React.useState<McpClientId>("claude-code");
  const [method, setMethod] = React.useState<McpAuthMethod>("oauth");
  const url = query.data?.url ?? "";

  return (
    <SectionCard
      title="Connect an AI client"
      description="Pick your client and how it should sign in. OAuth opens a Luraba sign-in and asks you to allow the agent; an API key is a token you create yourself."
    >
      <DataBoundary
        isPending={query.isPending}
        isError={query.isError}
        isEmpty={false}
        loading={<ConnectLoading />}
        errorState={
          <ErrorState
            title="Couldn't load the setup"
            description={query.error?.message}
            onRetry={() => void query.refetch()}
          />
        }
        empty={null}
      >
        <div className="space-y-4">
          <Choice label="AI client" value={client} options={MCP_CLIENTS} onChange={setClient} />
          <Choice label="Sign-in method" value={method} options={METHODS} onChange={setMethod} />
          {method === "api-key" ? (
            <Typography variant="small-muted">
              Create a key in{" "}
              <Link href="/settings/api-keys" className="underline underline-offset-2">
                API keys
              </Link>{" "}
              and replace <code className="font-mono">lur_YOUR_API_KEY</code> below.
            </Typography>
          ) : null}
          <SectionBlock title={MCP_CLIENTS.find((item) => item.id === client)?.label}>
            <div className="space-y-4">
              {buildMcpSnippets(client, method, url).map((snippet) => (
                <div key={snippet.title} className="space-y-1.5">
                  <Typography variant="small-muted">{snippet.title}</Typography>
                  <CopyBlock value={snippet.code} label="Copy snippet" />
                </div>
              ))}
            </div>
          </SectionBlock>
        </div>
      </DataBoundary>
    </SectionCard>
  );
}
