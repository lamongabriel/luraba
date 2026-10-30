"use client";

import {
  IMPORT_DATE_FORMATS,
  IMPORT_FIELDS,
  IMPORT_NUMBER_FORMATS,
  type ImportBatch,
  type ImportColumnMapping,
  type ImportFieldKey,
  missingImportFields,
} from "@luraba/contracts";
import * as React from "react";
import { DataBoundary, TableSkeleton } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { useSaveImportColumnsMutation } from "@/mutations/imports/use-import-mutations";
import { useImportPreviewQuery } from "@/queries/imports/use-imports-query";
import { ImportRawTable, PREVIEW_ROWS } from "./import-raw-table";

const NONE = "__none__";

const SOURCE_NOTE = {
  current: "Your confirmed mapping.",
  template: "Pre-filled from the layout you saved for this account.",
  aliases: "Suggested from the column names. Check each one.",
} as const;

const FORMAT_TRIGGER = "w-56";

/** One Luraba field: which file column feeds it, an example value and, where it applies, its format. */
function FieldRow({
  field,
  headers,
  value,
  example,
  onChange,
  format,
}: {
  field: (typeof IMPORT_FIELDS)[number];
  headers: readonly string[];
  value: string | undefined;
  example: string | undefined;
  onChange: (header: string | undefined) => void;
  format?: React.ReactNode;
}) {
  const id = `field-${field.key}`;
  return (
    <TableRow>
      <TableCell className="align-middle">
        <Label htmlFor={id} className="gap-1.5">
          {field.label}
          {field.required === "always" ? (
            <Badge variant="outline" className="font-normal">
              Required
            </Badge>
          ) : null}
        </Label>
        <p className="text-[0.6875rem] text-muted-foreground">{field.hint}</p>
      </TableCell>
      <TableCell className="align-middle">
        <Select
          value={value ?? NONE}
          onValueChange={(next) => onChange(next === NONE ? undefined : next)}
        >
          <SelectTrigger id={id} aria-label={field.label} className="w-full min-w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Not in this file</SelectItem>
            {headers.map((header) => (
              <SelectItem key={header} value={header}>
                {header}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="max-w-48 align-middle text-xs text-muted-foreground">
        <span className="block truncate" title={example}>
          {value ? (example ?? "—") : ""}
        </span>
      </TableCell>
      <TableCell className="align-middle">{format}</TableCell>
    </TableRow>
  );
}

const REQUIRED_FIELDS = IMPORT_FIELDS.filter((field) => field.required !== "no");
const OPTIONAL_FIELDS = IMPORT_FIELDS.filter((field) => field.required === "no");

/** Step 2: map the file's columns to Luraba's fields. Suggestions are only defaults. */
export function ColumnsStep({
  batch,
  onBack,
  onNext,
}: {
  batch: ImportBatch;
  onBack: () => void;
  onNext: () => void;
}) {
  const preview = useImportPreviewQuery(batch.id, PREVIEW_ROWS);
  const save = useSaveImportColumnsMutation();
  const [mapping, setMapping] = React.useState<ImportColumnMapping | null>(null);
  const [remember, setRemember] = React.useState(true);

  React.useEffect(() => {
    if (preview.data?.suggestion && !mapping) setMapping(preview.data.suggestion);
  }, [preview.data, mapping]);

  const data = preview.data;
  const headers = data?.headers ?? [];
  const missing = mapping ? missingImportFields(mapping) : [];

  const setColumn = (field: ImportFieldKey, header: string | undefined) =>
    setMapping((current) => {
      if (!current) return current;
      const columns = { ...current.columns };
      if (header) columns[field] = header;
      else delete columns[field];
      // One amount column or a money out/in pair, never both.
      if (header && field === "amount") {
        delete columns.debit;
        delete columns.credit;
      }
      if (header && (field === "debit" || field === "credit")) delete columns.amount;
      return { ...current, columns };
    });

  const highlight: Record<string, string> = {};
  for (const field of IMPORT_FIELDS) {
    const header = mapping?.columns[field.key];
    if (header) highlight[header] = field.label;
  }

  const exampleOf = (header: string | undefined) => {
    const index = header ? headers.indexOf(header) : -1;
    return index < 0 ? undefined : data?.rows.map((row) => row[index]).find((cell) => cell);
  };

  const dateFormatSelect = mapping ? (
    <Select
      value={mapping.dateFormat}
      onValueChange={(dateFormat) =>
        setMapping({ ...mapping, dateFormat: dateFormat as ImportColumnMapping["dateFormat"] })
      }
    >
      <SelectTrigger aria-label="Date format" className={FORMAT_TRIGGER}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {IMPORT_DATE_FORMATS.map((format) => (
          <SelectItem key={format.value} value={format.value}>
            {format.value} ({format.label})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ) : null;

  const numberFormatSelect = mapping ? (
    <Select
      value={mapping.decimalSeparator}
      onValueChange={(decimalSeparator) =>
        setMapping({
          ...mapping,
          decimalSeparator: decimalSeparator as ImportColumnMapping["decimalSeparator"],
        })
      }
    >
      <SelectTrigger aria-label="Number format" className={FORMAT_TRIGGER}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {IMPORT_NUMBER_FORMATS.map((format) => (
          <SelectItem key={format.value} value={format.value}>
            {format.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ) : null;

  // The number format sits on the first amount-like row that is mapped.
  const numberFormatField: ImportFieldKey | undefined = (
    ["amount", "debit", "credit"] as const
  ).find((key) => mapping?.columns[key]);

  const renderRow = (field: (typeof IMPORT_FIELDS)[number]) => (
    <FieldRow
      key={field.key}
      field={field}
      headers={headers}
      value={mapping?.columns[field.key]}
      example={exampleOf(mapping?.columns[field.key])}
      onChange={(header) => setColumn(field.key, header)}
      format={
        field.key === "date"
          ? dateFormatSelect
          : field.key === numberFormatField
            ? numberFormatSelect
            : undefined
      }
    />
  );

  const direction = mapping?.columns.direction;
  const directionValues = direction ? data?.columnValues[direction] : undefined;

  return (
    <div className="space-y-5">
      <DataBoundary
        isPending={preview.isPending || !mapping}
        isError={preview.isError}
        error={preview.error}
        onRetry={() => void preview.refetch()}
        errorTitle="Couldn't read the file"
        loading={<TableSkeleton columns={5} rows={PREVIEW_ROWS} label="Loading the columns" />}
      >
        {data && mapping ? (
          <>
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Match your file to Luraba</h3>
              <p className="text-xs text-muted-foreground">
                {SOURCE_NOTE[data.suggestionSource ?? "aliases"]}
              </p>
            </div>
            <ImportRawTable headers={data.headers} rows={data.rows} highlight={highlight} />

            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Luraba field</TableHead>
                    <TableHead>Column in your file</TableHead>
                    <TableHead>Example</TableHead>
                    <TableHead>Format</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {REQUIRED_FIELDS.map((field) => renderRow(field))}
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableCell colSpan={4} className="text-xs font-medium text-muted-foreground">
                      Optional
                    </TableCell>
                  </TableRow>
                  {OPTIONAL_FIELDS.map((field) => renderRow(field))}
                  {mapping.columns.installment ? null : (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <Label htmlFor="installments-from-description">
                          Read installments from the description
                        </Label>
                        <p className="text-[0.6875rem] text-muted-foreground">
                          Off by default. Only if your file has no Installment column and ends
                          descriptions with "4/12". Check the result in Review, where you can set
                          any row's installment yourself
                        </p>
                      </TableCell>
                      <TableCell>
                        <Switch
                          id="installments-from-description"
                          aria-label="Read installments from the description"
                          checked={mapping.installmentsFromDescription}
                          onCheckedChange={(installmentsFromDescription) =>
                            setMapping({ ...mapping, installmentsFromDescription })
                          }
                        />
                      </TableCell>
                    </TableRow>
                  )}
                  {mapping.columns.amount && !direction ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-xs text-muted-foreground">
                        Money out is
                      </TableCell>
                      <TableCell>
                        <Select
                          value={mapping.amountSign}
                          onValueChange={(amountSign) =>
                            setMapping({
                              ...mapping,
                              amountSign: amountSign as ImportColumnMapping["amountSign"],
                            })
                          }
                        >
                          <SelectTrigger aria-label="Money out is" className={FORMAT_TRIGGER}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="negative_is_out">Negative (-12.50)</SelectItem>
                            <SelectItem value="positive_is_out">Positive (12.50)</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>

            {direction ? (
              <section className="space-y-2">
                <Label>Which values in "{direction}" mean money out?</Label>
                {directionValues ? (
                  <div className="flex flex-wrap gap-1.5">
                    {directionValues.map((value) => {
                      const selected = mapping.outflowValues.includes(value);
                      return (
                        <Button
                          key={value}
                          type="button"
                          size="sm"
                          aria-pressed={selected}
                          variant={selected ? "secondary" : "outline"}
                          onClick={() =>
                            setMapping({
                              ...mapping,
                              outflowValues: selected
                                ? mapping.outflowValues.filter((item) => item !== value)
                                : [...mapping.outflowValues, value],
                            })
                          }
                        >
                          {value}
                        </Button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    This column has too many different values to be a type. Choose another column.
                  </p>
                )}
              </section>
            ) : null}

            <div className="flex items-center gap-2">
              <Switch
                id="remember-layout"
                checked={remember}
                onCheckedChange={setRemember}
                aria-label="Remember this layout"
              />
              <Label htmlFor="remember-layout">Remember this layout for this account</Label>
            </div>
          </>
        ) : null}
      </DataBoundary>

      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-2 border-t bg-background/95 py-3 backdrop-blur">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <div className="flex items-center gap-3">
          {missing.length > 0 ? (
            <p className="text-xs text-muted-foreground">Map: {missing.join(", ")}</p>
          ) : null}
          <Button
            type="button"
            disabled={!mapping || missing.length > 0 || save.isPending}
            onClick={() =>
              mapping &&
              save.mutate(
                { id: batch.id, body: { mapping, saveTemplate: remember } },
                { onSuccess: onNext },
              )
            }
          >
            Next: map values
          </Button>
        </div>
      </div>
    </div>
  );
}
