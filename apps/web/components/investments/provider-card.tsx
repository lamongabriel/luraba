"use client";

import type { ProviderStatus } from "@luraba/contracts";
import { now } from "@luraba/domain";
import * as React from "react";

import { PERMISSIONS, PermissionButton, useCan } from "@/components/permissions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/masked-input";
import { Switch } from "@/components/ui/switch";
import { useUpdateMarketDataProviderMutation } from "@/mutations/investments/use-investments-mutations";

import { formatAge } from "./format";

const FRESHNESS_LABEL = {
  realtime: "Real time",
  delayed: "Delayed",
  eod: "End of day",
} as const;

/** One market-data provider: switch it on or off, set its priority and API key, see how it is doing. */
export function ProviderCard({ provider }: { provider: ProviderStatus }) {
  const can = useCan();
  const canWrite = can(PERMISSIONS.INVESTMENTS_WRITE);
  const [priority, setPriority] = React.useState(
    provider.priority === null ? "" : String(provider.priority),
  );
  const [apiKey, setApiKey] = React.useState("");
  const update = useUpdateMarketDataProviderMutation({
    successToast: { title: `${provider.name} updated` },
    onSuccess: () => setApiKey(""),
  });
  const save = (body: Parameters<typeof update.mutate>[0]["body"]) =>
    update.mutate({ id: provider.id, body });
  const nowMs = now().getTime();

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium">{provider.name}</h3>
              <Badge variant="outline">{FRESHNESS_LABEL[provider.freshness]}</Badge>
              {provider.premium ? <Badge variant="secondary">Premium</Badge> : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {provider.markets.join(", ")} · {provider.capabilities.join(", ")}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Switch
              id={`provider-${provider.id}`}
              checked={provider.enabled}
              disabled={!canWrite || update.isPending}
              onCheckedChange={(enabled) => save({ enabled })}
              aria-labelledby={`provider-${provider.id}-label`}
            />
            <span id={`provider-${provider.id}-label`}>{provider.enabled ? "On" : "Off"}</span>
          </div>
        </div>

        <dl className="grid gap-3 text-xs sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">Last success</dt>
            <dd>{formatAge(provider.health.lastSuccessAt, nowMs)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Requests</dt>
            <dd>
              {provider.health.successes} ok · {provider.health.failures} failed
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Limits</dt>
            <dd>
              {provider.rateLimits.perMinute
                ? `${provider.rateLimits.perMinute}/min`
                : "No per-minute cap"}
              {provider.rateLimits.perDay ? ` · ${provider.rateLimits.perDay}/day` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Left today</dt>
            <dd>{provider.remainingToday ?? "No cap"}</dd>
          </div>
        </dl>
        {provider.health.lastError ? (
          <p className="text-xs text-destructive">Last error: {provider.health.lastError}</p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:items-end">
          <div className="space-y-1.5">
            <label htmlFor={`priority-${provider.id}`} className="text-xs font-medium">
              Priority
            </label>
            <NumberInput
              id={`priority-${provider.id}`}
              value={priority}
              decimals={0}
              disabled={!canWrite}
              onValueChange={setPriority}
              onBlur={() => {
                const next = priority === "" ? null : Number(priority);
                if (next !== provider.priority) save({ priority: next });
              }}
            />
          </div>
          {provider.requiresApiKey ? (
            <div className="space-y-1.5">
              <label htmlFor={`key-${provider.id}`} className="text-xs font-medium">
                API key {provider.hasApiKey ? "(saved)" : ""}
              </label>
              <Input
                id={`key-${provider.id}`}
                type="password"
                autoComplete="off"
                value={apiKey}
                disabled={!canWrite}
                placeholder={
                  provider.hasApiKey ? "Enter a new key to replace it" : "Paste your key"
                }
                onChange={(event) => setApiKey(event.target.value)}
              />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No API key needed.</p>
          )}
          {provider.requiresApiKey ? (
            <div className="flex gap-2">
              <PermissionButton
                permission={PERMISSIONS.INVESTMENTS_WRITE}
                size="sm"
                disabled={!apiKey}
                isLoading={update.isPending}
                onClick={() => save({ apiKey })}
              >
                Save key
              </PermissionButton>
              {provider.hasApiKey ? (
                <PermissionButton
                  permission={PERMISSIONS.INVESTMENTS_WRITE}
                  size="sm"
                  variant="ghost"
                  onClick={() => save({ apiKey: "" })}
                >
                  Remove
                </PermissionButton>
              ) : null}
            </div>
          ) : null}
        </div>
        {update.errorMessage ? (
          <p className="text-xs text-destructive" role="alert">
            {update.errorMessage}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
