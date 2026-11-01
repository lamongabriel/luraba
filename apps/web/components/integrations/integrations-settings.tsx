"use client";

import { PlugSocketIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { BrandfetchCard } from "@/components/integrations/brandfetch-card";
import { SectionCard } from "@/components/section/section-card";
import { DataBoundary, LoadingRegion } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";
import { useIntegrationsQuery } from "@/queries/integrations/use-integrations-query";

function IntegrationsLoading() {
  return (
    <LoadingRegion label="Loading integrations">
      <SectionCard
        title={<Skeleton className="h-5 w-28" />}
        description={<Skeleton className="mt-1 h-4 w-80" />}
        actions={<Skeleton className="h-6 w-28" />}
      >
        <div className="space-y-4">
          <Skeleton className="h-4 w-full max-w-xl" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-36" />
        </div>
      </SectionCard>
    </LoadingRegion>
  );
}

/** `/household/integrations`: every third-party provider as a section (today: Brandfetch). */
export function IntegrationsSettings() {
  const query = useIntegrationsQuery();
  const integrations = query.data?.data ?? [];
  const brandfetch = integrations.find((item) => item.provider === "brandfetch");

  return (
    <DataBoundary
      isPending={query.isPending}
      isError={query.isError}
      isEmpty={integrations.length === 0}
      loading={<IntegrationsLoading />}
      errorState={
        <ErrorState
          title="Couldn't load integrations"
          description={query.error?.message}
          onRetry={() => void query.refetch()}
        />
      }
      empty={
        <EmptyState
          icon={<HugeiconsIcon icon={PlugSocketIcon} strokeWidth={1.8} className="size-5" />}
          title="No integrations available"
          description="Services you can connect to Luraba show up here."
        />
      }
    >
      {brandfetch ? <BrandfetchCard integration={brandfetch} /> : null}
    </DataBoundary>
  );
}
