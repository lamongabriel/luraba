import type { HouseholdContext } from "@/interfaces/household"
import type { User } from "@/interfaces/user"

export interface AuthSession {
  user: User
  household: HouseholdContext | null
}

export interface AuthProviders {
  emailPassword: boolean
  socialProviders: {
    google: boolean
    github: boolean
  }
}
