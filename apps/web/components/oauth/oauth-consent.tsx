"use client";

import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { AuthPageHeader } from "@/components/auth/auth-page-header";
import { ErrorState } from "@/components/error-state";
import { DataBoundary, LoadingRegion } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { apiConfig } from "@/config/api";
import { useMcpClientQuery } from "@/queries/mcp/use-mcp-queries";

const PERMISSIONS = [
  "See your accounts, balances, transactions, budgets and goals",
  "Create and change transactions, categories, merchants and tags",
  "Act with your role in your household, never with more access than you have",
] as const;

async function answerConsent(consentCode: string, accept: boolean): Promise<string> {
  const response = await fetch(`${apiConfig.authBaseUrl}/oauth2/consent`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accept, consent_code: consentCode }),
  });
  const body = (await response.json().catch(() => null)) as { redirectURI?: string } | null;
  if (!response.ok || !body?.redirectURI) {
    throw new Error("This request expired. Go back to your AI client and connect again.");
  }
  return body.redirectURI;
}

function ConsentLoading() {
  return (
    <LoadingRegion label="Loading request">
      <Card>
        <CardContent className="space-y-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-2/3" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-32" />
          </div>
        </CardContent>
      </Card>
    </LoadingRegion>
  );
}

/** The consent screen of the MCP OAuth flow: "Allow <agent> to access your Luraba household?". */
export function OAuthConsent() {
  const params = useSearchParams();
  const consentCode = params.get("consent_code");
  const clientId = params.get("client_id");
  const client = useMcpClientQuery(clientId);
  const [pending, setPending] = React.useState<"allow" | "deny" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function answer(accept: boolean) {
    if (!consentCode) return;
    setPending(accept ? "allow" : "deny");
    setError(null);
    try {
      window.location.assign(await answerConsent(consentCode, accept));
    } catch (caught) {
      setPending(null);
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    }
  }

  const invalid = !consentCode || !clientId;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[29rem] items-center px-4 py-8">
      <div className="w-full space-y-6">
        <AuthPageHeader
          eyebrow="Connect an agent"
          title={client.data ? `Allow ${client.data.name}?` : "Allow this agent?"}
          description="An AI agent is asking to use Luraba as you."
        />
        {invalid ? (
          <ErrorState
            title="This link is not valid"
            description="Go back to your AI client and connect again."
          />
        ) : (
          <DataBoundary
            isPending={client.isPending}
            isError={client.isError}
            isEmpty={false}
            loading={<ConsentLoading />}
            errorState={
              <ErrorState
                title="We don't know this agent"
                description="Go back to your AI client and connect again."
              />
            }
            empty={null}
          >
            <Card>
              <CardContent className="space-y-4">
                <Typography variant="small-strong">
                  Allow {client.data?.name} to access your Luraba household with these permissions?
                </Typography>
                <ul className="space-y-2">
                  {PERMISSIONS.map((permission) => (
                    <li key={permission} className="flex items-start gap-2 text-sm">
                      <HugeiconsIcon
                        icon={Tick02Icon}
                        strokeWidth={2}
                        className="mt-0.5 size-4 shrink-0 text-emerald-600"
                      />
                      {permission}
                    </li>
                  ))}
                </ul>
                {client.data?.redirectHost ? (
                  <Typography variant="small-muted">
                    After you decide, you return to {client.data.redirectHost}. You can revoke
                    access any time in Settings &gt; MCP.
                  </Typography>
                ) : null}
                {error ? (
                  <Typography variant="small" className="text-destructive" role="alert">
                    {error}
                  </Typography>
                ) : null}
                <div className="flex gap-2">
                  <Button disabled={pending !== null} onClick={() => void answer(true)}>
                    {pending === "allow" ? "Allowing..." : "Allow"}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={pending !== null}
                    onClick={() => void answer(false)}
                  >
                    {pending === "deny" ? "Denying..." : "Deny"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </DataBoundary>
        )}
      </div>
    </main>
  );
}
