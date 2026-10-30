"use client";

import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { InvestmentSettingsForm } from "@/components/investments/forms/investment-settings-form";
import { ProviderCard } from "@/components/investments/provider-card";
import { DataBoundary } from "@/components/states";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useInvestmentSettingsQuery,
  useMarketDataProvidersQuery,
} from "@/queries/investments/use-investments-queries";
import { PriceProvidersEmpty } from "./_empty";
import { InvestmentSettingsError, PriceProvidersError } from "./_error";
import { InvestmentSettingsLoading, PriceProvidersLoading } from "./_loading";

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
          <DataBoundary
            isPending={settings.isPending}
            isError={settings.isError}
            loading={<InvestmentSettingsLoading />}
            errorState={
              <InvestmentSettingsError
                message={settings.error?.message}
                onRetry={() => void settings.refetch()}
              />
            }
          >
            {settings.data ? <InvestmentSettingsForm settings={settings.data} /> : null}
          </DataBoundary>
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
          <DataBoundary
            isPending={providers.isPending}
            isError={providers.isError}
            isEmpty={providers.data?.length === 0}
            loading={<PriceProvidersLoading />}
            errorState={
              <PriceProvidersError
                message={providers.error?.message}
                onRetry={() => void providers.refetch()}
              />
            }
            empty={<PriceProvidersEmpty />}
          >
            {providers.data?.map((provider) => (
              <ProviderCard key={provider.id} provider={provider} />
            ))}
          </DataBoundary>
        </CardContent>
      </Card>
    </InternalPageLayout>
  );
}
