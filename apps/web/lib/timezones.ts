import type { FormComboboxOption } from "@/components/forms/form-combobox"
import type { LocationTimezoneOption } from "@/interfaces/reference-data"

export function formatTimezoneLabel(timezone: string) {
  if (timezone === "UTC") return "UTC"

  const city = timezone.split("/").slice(1).join(" / ").replaceAll("_", " ")

  try {
    const offset = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "shortOffset",
    })
      .formatToParts(new Date())
      .find((part) => part.type === "timeZoneName")?.value

    return offset ? `${city} (${offset})` : city
  } catch {
    return city || timezone
  }
}

export function createTimezoneOptions(
  timezones: readonly LocationTimezoneOption[],
): FormComboboxOption[] {
  return timezones.map((timezone) => ({
    value: timezone.value,
    label: timezone.value,
    description: timezone.label,
    searchText: `${timezone.value} ${timezone.label} ${timezone.abbreviation}`,
  }))
}
