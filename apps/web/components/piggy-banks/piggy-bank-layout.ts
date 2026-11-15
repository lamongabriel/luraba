/**
 * Sizes the Piggy banks page and its loading twin share, so the skeleton and the loaded page never differ.
 */
/** The grid of piggy bank cards: 1 column on mobile, 2 on tablet, 3 on desktop. */
export const PIGGY_BANKS_GRID = "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3";
/** One piggy bank card (and its skeleton). */
export const PIGGY_BANK_CARD_HEIGHT = "h-40";
export const PIGGY_BANK_SKELETON_KEYS = Array.from(
  { length: 6 },
  (_, index) => `piggy-bank-${index}`,
);
/** The account summary strip above the grid (one row per parent account) and its skeleton. */
export const PIGGY_ACCOUNT_ROW_HEIGHT = "h-16";
