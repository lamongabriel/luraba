import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { dayGroup } from "../day-group";
import { ListRow } from "../list-row";
import { ListSkeleton } from "../list-skeleton";
import { MobileList, type MobileRowConfig } from "../mobile-list";

interface Item {
  id: string;
  name: string;
  day: string;
}

const ITEMS: Item[] = [
  { id: "1", name: "Coffee", day: "2026-11-12" },
  { id: "2", name: "Lunch", day: "2026-11-12" },
  { id: "3", name: "Rent", day: "2026-11-01" },
];

function Harness({
  config,
  onRowClick,
  sorting = [],
}: {
  config: MobileRowConfig<Item>;
  onRowClick?: (item: Item) => void;
  sorting?: { id: string; desc: boolean }[];
}) {
  const table = useReactTable({
    data: ITEMS,
    columns: [{ accessorKey: "name" }, { accessorKey: "day" }],
    state: { sorting },
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
  });
  return (
    <MobileList table={table} config={config} onRowClick={(row) => onRowClick?.(row.original)} />
  );
}

const config: MobileRowConfig<Item> = {
  row: (item, { grouped }) => ({
    title: item.name,
    meta: grouped ? null : item.day,
  }),
  group: (item) => ({ key: item.day, label: `Day ${item.day}` }),
  groupSortIds: ["day"],
  ariaLabel: (item) => `View ${item.name}`,
};

describe("dayGroup", () => {
  it("names today and yesterday, then the weekday and date", () => {
    expect(dayGroup("2026-11-12", "en", "2026-11-12").label).toBe("Today");
    expect(dayGroup("2026-11-11", "en", "2026-11-12").label).toBe("Yesterday");
    expect(dayGroup("2026-11-01", "en", "2026-11-12").label).toBe("Sun, Nov 1");
    expect(dayGroup("2025-12-24T10:00:00.000Z", "en", "2026-11-12")).toEqual({
      key: "2025-12-24",
      label: "Wed, Dec 24, 2025",
    });
  });
});

describe("ListRow", () => {
  it("is a button that opens on tap and on Enter, but not from its actions", () => {
    const onClick = vi.fn();
    const onAction = vi.fn();
    render(
      <ListRow
        title="Coffee"
        ariaLabel="View Coffee"
        onClick={onClick}
        actions={
          <button type="button" onClick={onAction}>
            Remove
          </button>
        }
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "View Coffee" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByRole("button", { name: "View Coffee" }), { key: "Enter" });
    expect(onClick).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onAction).toHaveBeenCalled();
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("is not interactive without onClick", () => {
    render(<ListRow title="Coffee" />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("MobileList", () => {
  it("groups rows under headers and drops the per-row date", () => {
    render(<Harness config={config} sorting={[{ id: "day", desc: true }]} />);
    expect(screen.getAllByText(/^Day /u).map((node) => node.textContent)).toEqual([
      "Day 2026-11-12",
      "Day 2026-11-01",
    ]);
    expect(screen.queryByText("2026-11-12", { selector: "div" })).toBeNull();
  });

  it("does not group when sorted by something else, and shows the date in the row", () => {
    render(<Harness config={config} sorting={[{ id: "name", desc: false }]} />);
    expect(screen.queryByText(/^Day /u)).toBeNull();
    expect(screen.getAllByText("2026-11-12")).toHaveLength(2);
  });

  it("opens the tapped row", () => {
    const onRowClick = vi.fn();
    render(<Harness config={config} onRowClick={onRowClick} />);
    fireEvent.click(screen.getByRole("button", { name: "View Rent" }));
    expect(onRowClick).toHaveBeenCalledWith(ITEMS[2]);
  });
});

describe("ListSkeleton", () => {
  it("draws the requested rows plus a group header", () => {
    const { container } = render(<ListSkeleton rows={4} grouped />);
    expect(container.querySelectorAll(".h-14")).toHaveLength(4);
    expect(container.querySelectorAll(".h-8")).toHaveLength(1);
  });
});
