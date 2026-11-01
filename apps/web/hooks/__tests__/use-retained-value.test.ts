import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useRetainedValue } from "../use-retained-value";

describe("useRetainedValue", () => {
  it("returns the value while it exists", () => {
    const { result } = renderHook(() => useRetainedValue({ id: 1 }, true));
    expect(result.current).toEqual({ id: 1 });
  });

  it("keeps the last value after it is cleared while closing", () => {
    const { result, rerender } = renderHook(
      ({ value, open }: { value: { id: number } | null; open: boolean }) =>
        useRetainedValue(value, open),
      { initialProps: { value: { id: 1 } as { id: number } | null, open: true } },
    );
    rerender({ value: null, open: false });
    expect(result.current).toEqual({ id: 1 });
  });

  it("is empty when the overlay is open with nothing selected (create mode)", () => {
    const { result, rerender } = renderHook(
      ({ value, open }: { value: { id: number } | null; open: boolean }) =>
        useRetainedValue(value, open),
      { initialProps: { value: { id: 1 } as { id: number } | null, open: false } },
    );
    rerender({ value: null, open: true });
    expect(result.current).toBeNull();
  });
});
