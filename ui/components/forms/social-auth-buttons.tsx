"use client"

import type { SignInSocialHttpBody } from "@/interfaces/http/auth-http"
import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import { useSocialSignInMutation } from "@/mutations/auth/use-social-sign-in-mutation"
import { useAuthProvidersQuery } from "@/queries/auth/use-auth-providers-query"

type SocialAuthButtonsProps = {
  mode: "login" | "register"
}

const socialProviderLabels = {
  github: "GitHub",
  google: "Google",
} as const

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path
        d="M21.6 12.23c0-.7-.06-1.22-.2-1.77H12v3.35h5.52a4.72 4.72 0 0 1-2.04 3.1v2.57h3.3c1.94-1.79 2.82-4.42 2.82-7.25Z"
        fill="currentColor"
      />
      <path
        d="M12 22c2.7 0 4.96-.9 6.61-2.43l-3.3-2.57c-.92.62-2.09.98-3.31.98-2.54 0-4.7-1.71-5.47-4.01H3.13v2.65A9.99 9.99 0 0 0 12 22Z"
        fill="currentColor"
      />
      <path
        d="M6.53 13.97A5.99 5.99 0 0 1 6.2 12c0-.68.12-1.34.33-1.97V7.38H3.13A9.99 9.99 0 0 0 2 12c0 1.61.39 3.13 1.13 4.62l3.4-2.65Z"
        fill="currentColor"
      />
      <path
        d="M12 6.02c1.47 0 2.79.51 3.82 1.5l2.86-2.86C16.95 3.04 14.69 2 12 2 8.1 2 4.72 4.22 3.13 7.38l3.4 2.65c.76-2.3 2.93-4.01 5.47-4.01Z"
        fill="currentColor"
      />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path
        fill="currentColor"
        d="M12 2C6.48 2 2 6.58 2 12.22c0 4.5 2.87 8.31 6.84 9.66.5.1.68-.22.68-.49 0-.24-.01-1.04-.01-1.89-2.78.62-3.37-1.2-3.37-1.2-.46-1.2-1.11-1.51-1.11-1.51-.9-.63.07-.62.07-.62 1 .08 1.52 1.05 1.52 1.05.88 1.56 2.3 1.1 2.86.84.09-.66.35-1.1.63-1.35-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.31 9.31 0 0 1 12 6.92c.85 0 1.7.12 2.5.36 1.9-1.34 2.75-1.05 2.75-1.05.54 1.4.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.68.95.68 1.92 0 1.39-.01 2.5-.01 2.84 0 .27.18.6.69.49A10.24 10.24 0 0 0 22 12.22C22 6.58 17.52 2 12 2Z"
      />
    </svg>
  )
}

const socialProviderIcons = {
  github: GitHubIcon,
  google: GoogleIcon,
} as const

export function SocialAuthButtons({ mode }: SocialAuthButtonsProps) {
  const providersQuery = useAuthProvidersQuery()
  const socialMutation = useSocialSignInMutation()

  if (!providersQuery.data) {
    return null
  }

  const availableProviders = Object.entries(providersQuery.data.socialProviders).filter(
    ([, enabled]) => enabled,
  ) as Array<[keyof typeof socialProviderLabels, boolean]>

  if (availableProviders.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-white/7" />
        </div>
        <div className="relative flex justify-center">
          <Typography
            variant="small-muted"
            className="bg-[var(--color-container)] px-3 text-[0.72rem]"
          >
            Or
          </Typography>
        </div>
      </div>

      <div className="grid gap-2">
        {availableProviders.map(([provider]) => {
          const Icon = socialProviderIcons[provider]

          return (
            <Button
              key={provider}
              type="button"
              variant="outline"
              className="h-10 w-full justify-start gap-2.5 rounded-xl border-white/10 bg-white/[0.03] px-4 text-left hover:bg-white/[0.06]"
              disabled={socialMutation.isPending}
              onClick={() => {
                const body: SignInSocialHttpBody = {
                  callbackURL: "/dashboard",
                  provider,
                }

                socialMutation.reset()
                socialMutation.mutate(body)
              }}
            >
              <span className="flex size-8 items-center justify-center rounded-full border border-white/8 bg-black/20 text-foreground/86">
                <Icon />
              </span>
              <span className="flex flex-col items-start">
                <span className="text-sm text-foreground">
                  {mode === "register" ? "Sign up with" : "Sign in with"}{" "}
                  {socialProviderLabels[provider]}
                </span>
              </span>
            </Button>
          )
        })}
      </div>

      {socialMutation.errorMessage ? (
        <Typography variant="small-destructive">
          {socialMutation.errorMessage}
        </Typography>
      ) : null}
    </div>
  )
}
