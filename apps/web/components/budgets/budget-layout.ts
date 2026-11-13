/**
 * Sizes the Budgets page and its loading twin share, so the skeleton and the loaded page never
 * differ by a pixel. Change a value here and both follow.
 */
/** The allocation chart on top (flat, on the page background). */
export const BUDGET_ALLOCATION_HEIGHT = "h-56";
/** The grid of budget cards: 1 column on mobile, 2 on tablet, 3 on desktop. */
export const BUDGET_GRID = "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3";
/** One budget card (and its skeleton): name line, amounts, bar, status line. */
export const BUDGET_CARD_HEIGHT = "h-36";
/** How many card skeletons the loading state draws. */
export const BUDGET_SKELETON_COUNT = 6;
