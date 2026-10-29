"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/masked-input";
import { useDownloadExportMutation } from "@/mutations/imports/use-import-mutations";
import { useExportersQuery } from "@/queries/imports/use-imports-query";

export function ExportPanel() {
  const query = useExportersQuery();
  const download = useDownloadExportMutation();
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Download your Luraba data. CSV opens in any spreadsheet; JSON keeps every field and is best
        for backups.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1 text-xs">
          <Label htmlFor="export-from">From</Label>
          <DateInput id="export-from" value={dateFrom} onValueChange={setDateFrom} />
        </div>
        <div className="space-y-1 text-xs">
          <Label htmlFor="export-to">To</Label>
          <DateInput id="export-to" value={dateTo} onValueChange={setDateTo} />
        </div>
        <p className="pb-1.5 text-[0.6875rem] text-muted-foreground">
          The date range applies to transactions only.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {(query.data ?? []).map((exporter) => (
          <Card key={exporter.id}>
            <CardHeader>
              <CardTitle>{exporter.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">{exporter.description}</p>
              <div className="flex gap-2">
                {exporter.formats.map((format) => (
                  <Button
                    key={format}
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={download.isPending}
                    onClick={() =>
                      download.mutate({
                        id: exporter.id,
                        format,
                        dateFrom: exporter.supportsDateRange && dateFrom ? dateFrom : undefined,
                        dateTo: exporter.supportsDateRange && dateTo ? dateTo : undefined,
                      })
                    }
                  >
                    Download {format.toUpperCase()}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
