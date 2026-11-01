import type { ApiKeyStatus } from "@luraba/contracts";
import { differenceInCalendarDays, parseISODate, todayISODate } from "@luraba/domain";

export const API_KEY_STATUS_LABELS: Record<ApiKeyStatus, string> = {
  active: "Active",
  disabled: "Revoked",
  expired: "Expired",
};

export const API_KEY_STATUS_BADGE_CLASSES: Record<ApiKeyStatus, string> = {
  active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
  disabled: "text-muted-foreground",
  expired: "border-destructive/30 bg-destructive/10 text-destructive",
};

/** Days from today to an `YYYY-MM-DD` expiry date (at least 1), or null when there is no date. */
export function expiryDateToDays(date: string | null | undefined): number | null {
  if (!date) return null;
  return Math.max(1, differenceInCalendarDays(parseISODate(date), parseISODate(todayISODate())));
}
