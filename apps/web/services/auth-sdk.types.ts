export interface SignInEmailInput {
  email: string
  password: string
}

export interface SignUpEmailInput {
  email: string
  name: string
  password: string
}

export interface SignInSocialInput {
  callbackURL?: string
  provider: "github" | "google"
}
