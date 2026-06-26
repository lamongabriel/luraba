export type UserPreferredTheme = "light" | "dark" | "system"

export interface UserPreferences {
  language: string
  currency: string
  timezone: string
  dateFormat: string
  preferredPeriod: string
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
