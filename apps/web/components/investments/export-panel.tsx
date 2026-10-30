"use client";

import type { InvestmentExportKind } from "@luraba/contracts";
import { todayISODate } from "@luraba/domain";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useInvestmentAccountsQuery } from "@/queries/investments/use-investments-queries";
import { downloadInvestmentExport } from "@/services/investments.service";

const KINDS: Array<{ value: InvestmentExportKind; label: string }> = [
  { value: "events", label: "Transactions" },
  { value: "positions", label: "Holdings" },
  { value: "income", label: "Income" },
  { value: "realized", label: "Realized gains" },
  { value: "tax", label: "Tax report" },
  { value: "backup", label: "Full backup" },
];
const ALL = "all";

/** Download your investment data as CSV or JSON. */
export function ExportPanel() {
  const accounts = useInvestmentAccountsQuery();
  const [kind, setKind] = React.useState<InvestmentExportKind>("events");
  const [fileFormat, setFileFormat] = React.useState<"csv" | "json">("csv");
  const [accountId, setAccountId] = React.useState(ALL);
  const [year, setYear] = React.useState(Number(todayISODate().slice(0, 4)));
  const [busy, setBusy] = React.useState(false);
  const currentYear = Number(todayISODate().slice(0, 4));

  const download = async () => {
    setBusy(true);
    try {
      const name = await downloadInvestmentExport(kind, {
        format: fileFormat,
        accountId: accountId === ALL ? undefined : accountId,
        year: kind === "tax" ? year : undefined,
      });
      toast.success(`Downloaded ${name}`);
    } catch {
      toast.error("We couldn't export that. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <label htmlFor="export-kind" className="text-xs font-medium">
            What to export
          </label>
          <Select value={kind} onValueChange={(value) => setKind(value as InvestmentExportKind)}>
            <SelectTrigger id="export-kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KINDS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="export-format" className="text-xs font-medium">
            Format
          </label>
          <Select
            value={fileFormat}
            onValueChange={(value) => setFileFormat(value as "csv" | "json")}
          >
            <SelectTrigger id="export-format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="export-account" className="text-xs font-medium">
            Account
          </label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger id="export-account">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All accounts</SelectItem>
              {(accounts.data ?? []).map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {kind === "tax" ? (
          <div className="space-y-1.5">
            <label htmlFor="export-year" className="text-xs font-medium">
              Tax year
            </label>
            <Select value={String(year)} onValueChange={(value) => setYear(Number(value))}>
              <SelectTrigger id="export-year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 6 }, (_, index) => currentYear - index).map((item) => (
                  <SelectItem key={item} value={String(item)}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>
      <Button onClick={() => void download()} isLoading={busy} loadingText="Preparing...">
        Download
      </Button>
    </div>
  );
}
