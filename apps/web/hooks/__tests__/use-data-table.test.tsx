import type { ColumnDef } from "@tanstack/react-table";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useDataTable } from "@/hooks/use-data-table";

type Row = {
  rowId: string;
  amount: number;
  postedDate: string;
};

const columns: ColumnDef<Row>[] = [{ accessorKey: "amount" }, { accessorKey: "postedDate" }];

describe("useDataTable", () => {
  it("uses stable API row ids and emits only one sort field", () => {
    const onSortChange = vi.fn();
    const { result } = renderHook(() =>
      useDataTable({
        columns,
        data: [
          { rowId: "installment-2", amount: 200, postedDate: "2026-02-01" },
          { rowId: "installment-1", amount: 100, postedDate: "2026-01-01" },
        ],
        getRowId: (row) => row.rowId,
        page: 1,
        pageCount: 1,
        perPage: 20,
        sort: "postedDate",
        sortDirection: "desc",
        onPageChange: vi.fn(),
        onPerPageChange: vi.fn(),
        onSortChange,
      }),
    );

    expect(result.current.table.getRowModel().rows.map((row) => row.id)).toEqual([
      "installment-2",
      "installment-1",
    ]);

    act(() => {
      result.current.table.setSorting([
        { id: "amount", desc: false },
        { id: "postedDate", desc: true },
      ]);
    });

    expect(onSortChange).toHaveBeenCalledWith("amount", "asc");
  });
});
