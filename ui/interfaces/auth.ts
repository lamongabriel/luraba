import type { HouseholdContext } from "@/interfaces/household";

export type UserPreferredTheme = "light" | "dark" | "system";

export interface UserPreferences {
  language: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  preferredPeriod: string;
  preferredTheme: UserPreferredTheme;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  defaultHouseholdId: string;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface AuthLoginData {
  user: AuthUser;
  household: HouseholdContext;
  accessToken: string;
}
