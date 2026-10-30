"use client";

import type { AllocationDimension, AllocationReport } from "@luraba/contracts";
import * as React from "react";

import { PERMISSIONS, PermissionButton } from "@/components/permissions";
import { NumberInput } from "@/components/ui/masked-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSetAllocationTargetsMutation } from "@/mutations/investments/use-investments-mutations";

import { PercentChange } from "./percent-change";
import { useInvestmentFormat } from "./use-investment-format";

/** Add exactly, in hundredths of a percent, so 33.33 + 33.33 + 33.34 reads as 100. */
function sumPercent(values: string[]) {
  const total = values.reduce((sum, value) => {
    const [whole = "0", fraction = ""] = (value || "0").split(".");
    return sum + Number(whole) * 10000 + Number(fraction.padEnd(4, "0").slice(0, 4));
  }, 0);
  return total / 10000;
}

/** Edit the target percent per bucket of a portfolio; shows the drift from where you are now. */
export function AllocationTargetsEditor({
  portfolioId,
  dimension,
  rows,
}: {
  portfolioId: string;
  dimension: AllocationDimension;
  rows: AllocationReport["targets"];
}) {
  const format = useInvestmentFormat();
  const [values, setValues] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    setValues(Object.fromEntries(rows.map((row) => [row.key, row.targetPercent])));
  }, [rows]);
  const save = useSetAllocationTargetsMutation({
    successToast: { title: "Targets saved" },
  });
  const total = sumPercent(rows.map((row) => values[row.key] ?? "0"));

  return (
    <div className="space-y-3">
      <div className="min-w-0 overflow-x-auto rounded-md border">
        <Table className="min-w-[36rem]">
          <TableHeader>
            <TableRow data-hover-disabled="true">
              <TableHead>Bucket</TableHead>
              <TableHead className="text-right">Now</TableHead>
              <TableHead className="w-36 text-right">Target %</TableHead>
              <TableHead className="text-right">Drift</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.key}>
                <TableCell>{row.label}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {format.percent(row.currentPercent)}
                </TableCell>
                <TableCell className="text-right">
                  <NumberInput
                    aria-label={`Target percent for ${row.label}`}
                    className="text-right"
                    value={values[row.key] ?? ""}
                    decimals={2}
                    onValueChange={(next) =>
                      setValues((current) => ({ ...current, [row.key]: next }))
                    }
                  />
                </TableCell>
                <TableCell className="text-right">
                  <PercentChange value={row.drift} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={total === 100 ? "text-xs text-muted-foreground" : "text-xs text-amber-600"}>
          Targets add up to {format.percent(total)}
          {total === 100 ? "" : " (they should total 100%)"}
        </p>
        <PermissionButton
          permission={PERMISSIONS.INVESTMENTS_WRITE}
          isLoading={save.isPending}
          loadingText="Saving..."
          onClick={() =>
            save.mutate({
              id: portfolioId,
              body: {
                dimension,
                targets: rows.map((row) => ({ key: row.key, percent: values[row.key] || "0" })),
              },
            })
          }
        >
          Save targets
        </PermissionButton>
      </div>
      {save.errorMessage ? (
        <p className="text-xs text-destructive" role="alert">
          {save.errorMessage}
        </p>
      ) : null}
    </div>
  );
}
