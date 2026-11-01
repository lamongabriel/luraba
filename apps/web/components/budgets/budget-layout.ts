/**
 * Sizes the Budgets page and its loading twin share, so the skeleton and the loaded page never
 * differ by a pixel. Change a value here and both follow.
 */
/** The summary band: every cell (and the loading cell) has this height. */
export const BUDGET_BAND_CELL = "[&>*]:h-24";
/** Categories on the left, the supporting charts in a slim rail on the right (stacked below on small screens). */
export const BUDGETS_BODY_GRID =
  "mt-10 grid items-start gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_24rem]";
/** One category row of a group (and its skeleton): name line plus bar line. */
export const CATEGORY_ROW_HEIGHT = "h-[5.25rem]";
/** The parent of a group (name, bar, caption) and its subcategories (thinner). */
export const PARENT_ROW_HEIGHT = "h-[6.5rem]";
export const CHILD_ROW_HEIGHT = "h-[3.75rem]";
/** The rail's two bodies. */
export const BUDGET_TREND_HEIGHT = "h-56";
export const BUDGET_ALLOCATION_HEIGHT = "h-44";
