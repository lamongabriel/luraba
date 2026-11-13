/**
 * Sizes the Goals page and its loading twin share, so the skeleton and the loaded page never differ.
 */
/** The grid of goal cards: 1 column on mobile, 2 on tablet, 3 on desktop. */
export const GOALS_GRID = "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3";
/** One goal card (and its skeleton). */
export const GOAL_CARD_HEIGHT = "h-44";
export const GOAL_SKELETON_COUNT = 6;
export const GOAL_SKELETON_KEYS = Array.from(
  { length: GOAL_SKELETON_COUNT },
  (_, index) => `goal-${index}`,
);
