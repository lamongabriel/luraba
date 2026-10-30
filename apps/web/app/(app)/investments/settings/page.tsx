"use client";

import { ErrorState } from "@/components/error-state";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { InvestmentSettingsForm } from "@/components/investments/forms/investment-settings-form";
import { ProviderCard } from "@/components/investments/provider-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useInvestmentSettingsQuery,
  useMarketDataProvidersQuery,
} from "@/queries/investments/use-investments-queries";

export default function InvestmentSettingsPage() {
  const settings = useInvestmentSettingsQuery();
  const providers = useMarketDataProvidersQuery();

  return (
    <InternalPageLayout
      title="Investment settings"
      subtitle="Defaults for new accounts and where your prices come from."
    >
      <Card>
        <CardHeader>
          <CardTitle>Defaults</CardTitle>
        </CardHeader>
        <CardContent>
          {settings.isPending ? (
            <Skeleton className="h-48 rounded-xl bg-muted/50" />
          ) : settings.isError ? (
            <ErrorState
              title="Couldn't load the settings"
              description={settings.error.message}
              onRetry={() => void settings.refetch()}
            />
          ) : (
            <InvestmentSettingsForm settings={settings.data} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Price providers</CardTitle>
          <CardDescription>
            Prices are cached and refreshed in the background every few minutes while markets are
            open. The provider with the lowest priority number is asked first; the next one steps in
            when it fails.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {providers.isPending ? (
            <Skeleton className="h-40 rounded-xl bg-muted/50" />
          ) : providers.isError ? (
            <ErrorState
              title="Couldn't load the providers"
              description={providers.error.message}
              onRetry={() => void providers.refetch()}
            />
          ) : (
            providers.data.map((provider) => <ProviderCard key={provider.id} provider={provider} />)
          )}
        </CardContent>
      </Card>
    </InternalPageLayout>
  );
}
