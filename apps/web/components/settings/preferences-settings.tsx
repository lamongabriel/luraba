"use client";

import { useEffect, useState } from "react";
import {
  CurrencySelectControl,
  DateFormatSelectControl,
  LanguageSelectControl,
  PreferredPeriodSelectControl,
  PreferredThemeSelectControl,
  TimeZoneSelectControl,
} from "@/components/display";
import { ErrorState } from "@/components/error-state";
import { SectionCard } from "@/components/section/section-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpdateUserPreferencesMutation } from "@/mutations/auth/use-update-user-preferences-mutation";
import { useUserPreferencesQuery } from "@/queries/auth/use-user-preferences-query";
import { useLocationOptionsQuery } from "@/queries/reference-data/use-location-options-query";

export function PreferencesSettings() {
  const query = useUserPreferencesQuery();
  const locationOptionsQuery = useLocationOptionsQuery();
  const mutation = useUpdateUserPreferencesMutation();
  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => {
    if (query.data)
      setValues({
        language: query.data.language,
        currency: query.data.currency,
        timezone: query.data.timezone,
        dateFormat: query.data.dateFormat,
        preferredPeriod: query.data.preferredPeriod,
        preferredTheme: query.data.preferredTheme,
      });
  }, [query.data]);
  if (query.isLoading || locationOptionsQuery.isLoading) return <Skeleton className="h-72" />;
  if (query.isError || !query.data)
    return (
      <ErrorState
        title="Couldn't load preferences"
        description={query.error?.message}
        onRetry={() => query.refetch()}
      />
    );
  if (locationOptionsQuery.isError || !locationOptionsQuery.data)
    return (
      <ErrorState
        title="Couldn't load location options"
        description={locationOptionsQuery.error?.message}
        onRetry={() => locationOptionsQuery.refetch()}
      />
    );

  const fields = [
    ["language", "Language", LanguageSelectControl],
    ["currency", "Currency", CurrencySelectControl],
    ["timezone", "Time zone", TimeZoneSelectControl],
    ["dateFormat", "Date format", DateFormatSelectControl],
    ["preferredPeriod", "Default period", PreferredPeriodSelectControl],
    ["preferredTheme", "Theme", PreferredThemeSelectControl],
  ] as const;
  return (
    <SectionCard
      title="Preferences"
      description="These defaults shape dates and presentation across Luraba."
      contentClassName="grid gap-4 sm:grid-cols-2"
    >
      {fields.map(([key, label, Control]) => (
        <div key={key} className="space-y-2">
          <Label htmlFor={`preference-${key}`}>{label}</Label>
          <Control
            id={`preference-${key}`}
            value={values[key] ?? ""}
            onChange={(value) => setValues((current) => ({ ...current, [key]: value }))}
          />
        </div>
      ))}
      <div className="flex justify-end sm:col-span-2">
        <Button isLoading={mutation.isPending} onClick={() => mutation.mutate(values as never)}>
          Save preferences
        </Button>
      </div>
    </SectionCard>
  );
}
