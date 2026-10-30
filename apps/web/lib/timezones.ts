import type { LocationTimezoneOption } from "@luraba/contracts";
import { now } from "@luraba/domain";

/**
 * Time zones come from the API (`/reference-data/locations`), the single list the server also
 * validates against. This file only formats them.
 */

/** `America / New York (GMT-5)`; `UTC` stays `UTC`. */
export function formatTimezoneLabel(timezone: string): string {
  if (timezone === "UTC") return "UTC";

  const city = timezone.split("/").slice(1).join(" / ").replaceAll("_", " ");

  try {
    const offset = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "shortOffset",
    })
      .formatToParts(now())
      .find((part) => part.type === "timeZoneName")?.value;

    return offset ? `${city} (${offset})` : city;
  } catch {
    return city || timezone;
  }
}

/** `GMT-5` style offset of a zone right now, "" when the runtime does not know the zone. */
export function timezoneOffsetLabel(timezone: string): string {
  if (timezone === "UTC") return "GMT";
  try {
    return (
      new Intl.DateTimeFormat("en-US", { timeZone: timezone, timeZoneName: "shortOffset" })
        .formatToParts(now())
        .find((part) => part.type === "timeZoneName")?.value ?? ""
    );
  } catch {
    return "";
  }
}

export interface TimezoneChoice {
  value: string;
  /** The IANA name: `America/New_York`. */
  label: string;
  /** The friendly name from the API: `Eastern Time (US & Canada)`. */
  description: string;
  offset: string;
  searchText: string;
}

export function createTimezoneChoices(
  timezones: readonly LocationTimezoneOption[],
): TimezoneChoice[] {
  return timezones.map((timezone) => ({
    value: timezone.value,
    label: timezone.value,
    description: timezone.label,
    offset: timezoneOffsetLabel(timezone.value),
    searchText: `${timezone.value} ${timezone.label} ${timezone.abbreviation}`,
  }));
}
