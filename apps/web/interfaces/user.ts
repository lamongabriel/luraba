export type UserPreferredTheme = "light" | "dark" | "system"
export type UserLanguage = "en" | "pt-BR"
export type UserTimezone = string
export type UserDateFormat = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD"
export type UserPreferredPeriod =
  | "last_day"
  | "current_week"
  | "last_7_days"
  | "current_month"
  | "last_month"
  | "last_30_days"
  | "last_90_days"
  | "current_year"
  | "last_365_days"
  | "last_5_years"
  | "last_10_years"
  | "all_time"

export interface UserPreferences {
  language: UserLanguage
  currency: string
  timezone: UserTimezone
  dateFormat: UserDateFormat
  preferredPeriod: UserPreferredPeriod
  preferredTheme: UserPreferredTheme
}

export interface User {
  id: string
  name: string
  email: string
  defaultHouseholdId: string | null
  preferences: UserPreferences
  createdAt: string
  updatedAt: string
}
