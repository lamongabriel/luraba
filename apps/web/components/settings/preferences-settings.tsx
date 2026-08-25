"use client"

import { useEffect, useState } from "react"
import { ErrorState } from "@/components/error-state"
import { ComboboxControl } from "@/components/forms/form-combobox"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { createTimezoneOptions } from "@/lib/timezones"
import { useUpdateUserPreferencesMutation } from "@/mutations/auth/use-update-user-preferences-mutation"
import { useUserPreferencesQuery } from "@/queries/auth/use-user-preferences-query"
import { useLocationOptionsQuery } from "@/queries/reference-data/use-location-options-query"

export function PreferencesSettings() {
  const query = useUserPreferencesQuery()
  const locationOptionsQuery = useLocationOptionsQuery()
  const mutation = useUpdateUserPreferencesMutation()
  const [values, setValues] = useState<Record<string, string>>({})
  useEffect(() => {
    if (query.data)
      setValues({
        language: query.data.language,
        currency: query.data.currency,
        timezone: query.data.timezone,
        dateFormat: query.data.dateFormat,
        preferredPeriod: query.data.preferredPeriod,
        preferredTheme: query.data.preferredTheme,
      })
  }, [query.data])
  if (query.isLoading || locationOptionsQuery.isLoading)
    return <Skeleton className="h-72" />
  if (query.isError || !query.data)
    return (
      <ErrorState
        title="Couldn't load preferences"
        description={query.error?.message}
        onRetry={() => query.refetch()}
      />
    )
  if (locationOptionsQuery.isError || !locationOptionsQuery.data)
    return (
      <ErrorState
        title="Couldn't load location options"
        description={locationOptionsQuery.error?.message}
        onRetry={() => locationOptionsQuery.refetch()}
      />
    )

  const timezoneOptions = createTimezoneOptions(
    locationOptionsQuery.data.timezones,
  )
  const fields = [
    ["language", "Language", ["en", "pt-BR"]],
    ["currency", "Currency", ["USD", "BRL", "EUR"]],
    ["dateFormat", "Date format", ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"]],
    [
      "preferredPeriod",
      "Default period",
      [
        "current_month",
        "last_30_days",
        "last_90_days",
        "current_year",
        "all_time",
      ],
    ],
    ["preferredTheme", "Theme", ["system", "light", "dark"]],
  ] as const
  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
        <p className="text-xs text-muted-foreground">
          These defaults shape dates and presentation across Luraba.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {fields.map(([key, label, options]) => (
          <div key={key} className="space-y-2">
            <Label>{label}</Label>
            <Select
              value={values[key]}
              onValueChange={(value) =>
                setValues((current) => ({ ...current, [key]: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <ComboboxControl
            id="timezone"
            value={values.timezone ?? ""}
            options={timezoneOptions}
            onChange={(timezone) =>
              setValues((current) => ({ ...current, timezone }))
            }
            placeholder="Select timezone"
            searchPlaceholder="Search timezones..."
            emptyMessage="No timezones found."
          />
        </div>
        <div className="flex justify-end sm:col-span-2">
          <Button
            isLoading={mutation.isPending}
            onClick={() => mutation.mutate(values as never)}
          >
            Save preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
