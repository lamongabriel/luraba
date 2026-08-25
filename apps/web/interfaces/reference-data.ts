export interface LocationCountryOption {
  code: string
  emoji: string
  image: string
  name: string
}

export interface LocationTimezoneOption {
  abbreviation: string
  isDaylightSaving: boolean
  label: string
  offset: number
  value: string
}

export interface LocationOptions {
  countries: LocationCountryOption[]
  timezones: LocationTimezoneOption[]
}
