import { act, renderHook, waitFor } from "@testing-library/react";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";
import { describe, expect, it, vi } from "vitest";

import { useApiParams } from "@/hooks/use-api-params";

const FILTERS = {
  dateFrom: { type: "string" },
  dateTo: { type: "string" },
  originTypes: { type: "stringArray" },
  accountIds: { type: "stringArray" },
  amountMin: { type: "integer" },
  includeInBudget: { type: "boolean" },
} as const;

const SORT_FIELDS = ["postedDate", "amount", "description"] as const;

describe("useApiParams API sorting and filters", () => {
  it("reads search, filters, pagination, and one flat sort from the URL", () => {
    const { result } = renderHook(
      () =>
        useApiParams({
          filters: FILTERS,
          pagination: true,
          defaultPerPage: 20,
          sorting: {
            fields: SORT_FIELDS,
            defaultField: "postedDate",
            defaultDirection: "desc",
          },
        }),
      {
        wrapper: withNuqsTestingAdapter({
          searchParams:
            "?search=Salary&originTypes=income,transfer&accountIds=account-1,account-2&dateFrom=2025-01-01&dateTo=2025-12-31&amountMin=100&includeInBudget=true&page=2&perPage=50&sort=amount&sortDirection=asc",
        }),
      },
    );

    expect(result.current.apiParams).toEqual({
      search: "Salary",
      originTypes: ["income", "transfer"],
      accountIds: ["account-1", "account-2"],
      dateFrom: "2025-01-01",
      dateTo: "2025-12-31",
      amountMin: 100,
      includeInBudget: true,
      page: 2,
      perPage: 50,
      sort: "amount",
      sortDirection: "asc",
    });
  });

  it("writes sorting as a field and direction without JSON or arrays", async () => {
    const onUrlUpdate = vi.fn();
    const { result } = renderHook(
      () =>
        useApiParams({
          filters: FILTERS,
          pagination: true,
          sorting: {
            fields: SORT_FIELDS,
            defaultField: "postedDate",
            defaultDirection: "desc",
          },
        }),
      {
        wrapper: withNuqsTestingAdapter({ hasMemory: true, onUrlUpdate }),
      },
    );

    act(() => result.current.setSorting("amount", "asc"));

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    const update = onUrlUpdate.mock.calls.at(-1)?.[0];

    expect(update.searchParams.get("sort")).toBe("amount");
    expect(update.searchParams.get("sortDirection")).toBe("asc");
    expect(update.queryString).not.toContain("[");
    expect(update.queryString).not.toContain("%5B");
  });

  it("debounces API search while keeping the input value responsive", async () => {
    const { result } = renderHook(() => useApiParams({ debounceMs: 10, filters: FILTERS }), {
      wrapper: withNuqsTestingAdapter({ hasMemory: true }),
    });

    act(() => result.current.setSearch("Annual Salary"));

    expect(result.current.search).toBe("Annual Salary");
    expect(result.current.apiParams.search).toBeUndefined();

    await waitFor(() => {
      expect(result.current.apiParams.search).toBe("Annual Salary");
    });
  });

  it("keeps namespaced tables independent and allows default filters to be cleared", async () => {
    const onUrlUpdate = vi.fn();
    const { result } = renderHook(
      () =>
        useApiParams({
          keyPrefix: "invitations",
          pagination: true,
          filters: {
            statuses: { type: "stringArray", defaultValue: ["pending"] },
          },
          suppressDefaultFiltersOnClear: true,
        }),
      {
        wrapper: withNuqsTestingAdapter({ hasMemory: true, onUrlUpdate }),
      },
    );

    expect(result.current.filters.statuses).toEqual(["pending"]);

    act(() => result.current.clearFilters());

    await waitFor(() => {
      expect(result.current.filters.statuses).toEqual([]);
    });
    expect(onUrlUpdate.mock.calls.at(-1)?.[0].searchParams.get("statuses")).toBeNull();
    expect(onUrlUpdate.mock.calls.at(-1)?.[0].searchParams.get("invitationsStatuses")).toBeNull();
  });
});
