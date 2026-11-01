"use client";

import * as React from "react";

/**
 * Keeps showing the last non-empty `value` while `open` is false, so a dialog or sheet whose
 * content comes from the page (the selected row, a pending action) does not empty out or shrink
 * while its exit animation plays.
 *
 * Pages may clear their selection the moment the overlay closes; the overlay reads the value
 * through this hook instead. The retained value is dropped once the overlay is closed and the
 * value changes to something new (or the component unmounts).
 *
 *   const shownRow = useRetainedValue(row, open);
 */
export function useRetainedValue<T>(value: T | null | undefined, open: boolean): T | null {
  const retained = React.useRef<T | null>(null);
  if (value !== null && value !== undefined) {
    retained.current = value;
  } else if (open) {
    retained.current = null;
  }
  return value ?? retained.current;
}
