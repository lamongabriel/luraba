"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** Rows shown in steps 1 and 2; one shared size so the second step reuses the first step's data. */
export const PREVIEW_ROWS = 8;

/**
 * The file exactly as written: header row and cells, no interpretation. `highlight` labels the
 * columns that are mapped to a Luraba field (step 2).
 */
export function ImportRawTable({
  headers,
  rows,
  highlight = {},
}: {
  headers: readonly string[];
  rows: readonly (readonly string[])[];
  highlight?: Readonly<Record<string, string>>;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((header) => (
              <TableHead key={header} className="align-top whitespace-nowrap">
                <span className="block">{header}</span>
                {highlight[header] ? (
                  <Badge variant="secondary" className="mt-1">
                    {highlight[header]}
                  </Badge>
                ) : null}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, rowIndex) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: raw rows have no id; the list never reorders
            <TableRow key={rowIndex}>
              {headers.map((header, columnIndex) => (
                <TableCell key={header} className="max-w-64 truncate" title={row[columnIndex]}>
                  {row[columnIndex]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
