import type { AuthProviders, AuthSession } from "@/interfaces/auth"
import type { UserPreferences } from "@/interfaces/user"

export interface SignInEmailHttpBody {
  email: string
  password: string
}

export interface SignUpEmailHttpBody {
  email: string
  name: string
  password: string
}

export interface SignInSocialHttpBody {
  callbackURL?: string
  provider: "github" | "google"
}

export type GetCurrentUserHttpResponse = AuthSession

export type GetAuthProvidersHttpResponse = AuthProviders
export type GetUserPreferencesHttpResponse = UserPreferences
export type UpdateUserPreferencesHttpBody = Partial<UserPreferences>
export type UpdateUserPreferencesHttpResponse = UserPreferences
