"use client";

import type { ImportPreview } from "@luraba/contracts";
import * as React from "react";

import { PERMISSIONS, PermissionButton } from "@/components/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCommitInvestmentImportMutation,
  usePreviewInvestmentImportMutation,
} from "@/mutations/investments/use-investments-mutations";
import { useInvestmentAccountsQuery } from "@/queries/investments/use-investments-queries";
import { downloadInvestmentImportTemplate } from "@/services/investments.service";

import { formatQuantity } from "./format";
import { useInvestmentFormat } from "./use-investment-format";

const FORMATS = [
  { value: "app_csv", label: "Luraba CSV (template)" },
  { value: "b3_negociacao", label: "B3 — Negociação (trades)" },
  { value: "b3_movimentacao", label: "B3 — Movimentação (income and events)" },
  { value: "generic_csv", label: "Other CSV (map the columns)" },
  { value: "json_backup", label: "Luraba JSON backup" },
] as const;
type FormatValue = (typeof FORMATS)[number]["value"];

const GENERIC_FIELDS = [
  { key: "date", label: "Date", required: true },
  { key: "type", label: "Type", required: true },
  { key: "symbol", label: "Symbol" },
  { key: "quantity", label: "Quantity" },
  { key: "unitPrice", label: "Unit price" },
  { key: "grossAmount", label: "Total amount" },
  { key: "fees", label: "Fees" },
  { key: "taxesWithheld", label: "Taxes withheld" },
  { key: "currency", label: "Currency" },
  { key: "notes", label: "Notes" },
  { key: "externalId", label: "Reference (for duplicates)" },
] as const;

const NONE = "__none__";

const STATUS_VARIANT = {
  ok: "secondary",
  duplicate: "outline",
  error: "destructive",
  unsupported: "outline",
} as const;

function toBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

function sniffHeaders(buffer: ArrayBuffer): string[] {
  const firstLine = new TextDecoder().decode(buffer.slice(0, 4096)).split(/\r?\n/u)[0] ?? "";
  const separator =
    firstLine.includes(";") && !firstLine.includes(",")
      ? ";"
      : firstLine.includes("\t")
        ? "\t"
        : ",";
  return firstLine
    .split(separator)
    .map((cell) => cell.replace(/^"|"$/gu, "").trim())
    .filter(Boolean);
}

/** Pick a file, preview what would be imported (with duplicates flagged), then confirm. */
export function ImportWizard({ initialAccountId }: { initialAccountId?: string }) {
  const format = useInvestmentFormat();
  const accounts = useInvestmentAccountsQuery();
  const [accountId, setAccountId] = React.useState(initialAccountId ?? "");
  const [importFormat, setImportFormat] = React.useState<FormatValue>("app_csv");
  const [broker, setBroker] = React.useState("");
  const [file, setFile] = React.useState<{ name: string; buffer: ArrayBuffer } | null>(null);
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [mapping, setMapping] = React.useState<Record<string, string>>({});
  const [saveMapping, setSaveMapping] = React.useState(true);
  const [includeDuplicates, setIncludeDuplicates] = React.useState(false);
  const [preview, setPreview] = React.useState<ImportPreview | null>(null);
  const [result, setResult] = React.useState<{ created: number; skipped: number } | null>(null);
  const [readError, setReadError] = React.useState<string | null>(null);

  const previewMutation = usePreviewInvestmentImportMutation({
    onSuccess: (data) => {
      setPreview(data);
      setResult(null);
    },
  });
  const commitMutation = useCommitInvestmentImportMutation({
    onSuccess: (data) => setResult({ created: data.created, skipped: data.skipped }),
  });

  const onFile = async (selected: File | undefined) => {
    setPreview(null);
    setResult(null);
    setReadError(null);
    if (!selected) {
      setFile(null);
      return;
    }
    try {
      const buffer = await selected.arrayBuffer();
      setFile({ name: selected.name, buffer });
      setHeaders(sniffHeaders(buffer));
    } catch {
      setReadError("We couldn't read that file.");
    }
  };

  const missingMapping = importFormat === "generic_csv" && !(mapping.date && mapping.type);
  const ready = Boolean(accountId && file) && !missingMapping;

  const runPreview = () => {
    if (!file) return;
    const isJson = importFormat === "json_backup";
    previewMutation.reset();
    previewMutation.mutate({
      accountId,
      format: importFormat,
      fileName: file.name,
      encoding: isJson ? "text" : "base64",
      content: isJson ? new TextDecoder().decode(file.buffer) : toBase64(file.buffer),
      ...(broker ? { broker } : {}),
      ...(importFormat === "generic_csv" ? { mapping, saveMapping } : {}),
    });
  };

  if (result) {
    return (
      <div className="space-y-3 rounded-xl border p-5">
        <p className="text-sm font-medium">
          Imported {result.created} {result.created === 1 ? "transaction" : "transactions"}
          {result.skipped > 0 ? ` and skipped ${result.skipped}` : ""}.
        </p>
        <div className="flex gap-2">
          <Button asChild>
            <a href="/investments/transactions">See transactions</a>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setResult(null);
              setPreview(null);
              setFile(null);
            }}
          >
            Import another file
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="import-account" className="text-xs font-medium">
            Account
          </label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger id="import-account">
              <SelectValue placeholder="Choose an account" />
            </SelectTrigger>
            <SelectContent>
              {(accounts.data ?? []).map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="import-format" className="text-xs font-medium">
            File format
          </label>
          <Select
            value={importFormat}
            onValueChange={(value) => {
              setImportFormat(value as FormatValue);
              setPreview(null);
            }}
          >
            <SelectTrigger id="import-format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORMATS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="import-file" className="text-xs font-medium">
          File
        </label>
        <Input
          id="import-file"
          type="file"
          accept=".csv,.txt,.xlsx,.xls,.json"
          onChange={(event) => void onFile(event.target.files?.[0])}
        />
        {readError ? (
          <p className="text-xs text-destructive" role="alert">
            {readError}
          </p>
        ) : null}
        {importFormat === "app_csv" ? (
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-xs"
            onClick={() => void downloadInvestmentImportTemplate()}
          >
            Download the CSV template
          </Button>
        ) : null}
      </div>

      <div className="space-y-1.5 sm:max-w-sm">
        <label htmlFor="import-broker" className="text-xs font-medium">
          Broker (optional)
        </label>
        <Input
          id="import-broker"
          value={broker}
          onChange={(event) => setBroker(event.target.value)}
          placeholder="Charles Schwab"
        />
      </div>

      {importFormat === "generic_csv" && headers.length > 0 ? (
        <fieldset className="space-y-3 rounded-xl border p-4">
          <legend className="px-1 text-xs font-medium">Match your columns</legend>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {GENERIC_FIELDS.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <label htmlFor={`map-${field.key}`} className="text-xs text-muted-foreground">
                  {field.label}
                  {"required" in field && field.required ? " *" : ""}
                </label>
                <Select
                  value={mapping[field.key] ?? NONE}
                  onValueChange={(value) =>
                    setMapping((current) => {
                      const next = { ...current };
                      if (value === NONE) delete next[field.key];
                      else next[field.key] = value;
                      return next;
                    })
                  }
                >
                  <SelectTrigger id={`map-${field.key}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Not in my file</SelectItem>
                    {headers.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch
              id="save-mapping"
              checked={saveMapping}
              onCheckedChange={setSaveMapping}
              aria-labelledby="save-mapping-label"
            />
            <span id="save-mapping-label">Remember this mapping for next time</span>
          </div>
        </fieldset>
      ) : null}

      <PermissionButton
        permission={PERMISSIONS.INVESTMENTS_WRITE}
        disabled={!ready}
        isLoading={previewMutation.isPending}
        loadingText="Reading..."
        onClick={runPreview}
      >
        Preview import
      </PermissionButton>
      {previewMutation.errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {previewMutation.errorMessage}
        </p>
      ) : null}

      {preview ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{preview.ok} ready</Badge>
            <Badge variant="outline">{preview.duplicates} duplicates</Badge>
            <Badge variant={preview.errors > 0 ? "destructive" : "outline"}>
              {preview.errors} errors
            </Badge>
            {preview.unsupported > 0 ? (
              <Badge variant="outline">{preview.unsupported} not supported</Badge>
            ) : null}
          </div>
          {preview.unsupportedTypes.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Not imported automatically: {preview.unsupportedTypes.join(", ")}. Add these by hand
              as transactions.
            </p>
          ) : null}
          <div className="max-h-96 min-w-0 overflow-auto rounded-md border">
            <Table className="min-w-[44rem]">
              <TableHeader>
                <TableRow data-hover-disabled="true">
                  <TableHead>Row</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.rows.map((row) => (
                  <TableRow key={row.row}>
                    <TableCell>{row.row}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {row.event?.tradeDate ?? "—"}
                    </TableCell>
                    <TableCell>{row.event?.type ?? "—"}</TableCell>
                    <TableCell>{row.event?.symbol ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.event?.quantity
                        ? formatQuantity(row.event.quantity, format.language)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.event ? `${row.event.grossAmount} ${row.event.currencyCode}` : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.message ?? ""}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {preview.duplicates > 0 ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch
                id="include-duplicates"
                checked={includeDuplicates}
                onCheckedChange={setIncludeDuplicates}
                aria-labelledby="include-duplicates-label"
              />
              <span id="include-duplicates-label">Import the duplicates anyway</span>
            </div>
          ) : null}
          <PermissionButton
            permission={PERMISSIONS.INVESTMENTS_WRITE}
            disabled={preview.ok === 0 && !(includeDuplicates && preview.duplicates > 0)}
            isLoading={commitMutation.isPending}
            loadingText="Importing..."
            onClick={() => {
              commitMutation.reset();
              commitMutation.mutate({
                id: preview.batchId,
                body: { includeDuplicates, skipRows: [] },
              });
            }}
          >
            Import {includeDuplicates ? preview.ok + preview.duplicates : preview.ok} transactions
          </PermissionButton>
          {commitMutation.errorMessage ? (
            <p className="text-sm text-destructive" role="alert">
              {commitMutation.errorMessage}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
