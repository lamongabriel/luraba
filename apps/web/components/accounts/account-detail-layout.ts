/**
 * Shared shape of the account detail page, so `app/(app)/accounts/[id]/_loading.tsx` can mirror the
 * loaded page one to one: change a value here and both move together.
 *
 * ```
 * header      mark + name + detail line .............. period, Edit
 * main (2/3)  balance + in/out chips + flat chart     side (1/3)  credit cards | loan outlook
 *             key figures strip                                   expenses by category
 *             cash flow                                           top merchants
 *             recent transactions (table on page)                 upcoming charges (fills the rest)
 * details     labeled grid, only when it adds information
 * ```
 */
export const ACCOUNT_PAGE_GRID = "grid items-stretch gap-8 pt-3 lg:grid-cols-3 lg:gap-10";
export const ACCOUNT_MAIN_COLUMN = "min-w-0 space-y-10 lg:col-span-2";
/** The side column stretches to the main one; its last panel (`fill`) takes the leftover height. */
export const ACCOUNT_SIDE_COLUMN = "flex min-w-0 flex-col gap-4";
export const ACCOUNT_STAT_COUNT = 5;
/** Plot height of the balance chart that sits under the headline number. */
export const ACCOUNT_BALANCE_CHART_HEIGHT = "h-56";
/** Rows the recent transactions table shows (the query asks for this many). */
export const ACCOUNT_RECENT_TRANSACTIONS = 8;
/** Upcoming rows listed in the side column; the stat still sums all of them. */
export const ACCOUNT_UPCOMING_ROWS = 5;
export const ACCOUNT_TOP_MERCHANTS = 4;
