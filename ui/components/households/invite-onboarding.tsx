"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import * as React from "react"
import { useForm } from "react-hook-form"

import { AuthPageHeader } from "@/components/auth/auth-page-header"
import { AuthFormFrame } from "@/components/forms/auth/auth-form-frame"
import {
  type LoginFormValues,
  loginFormSchema,
} from "@/components/forms/auth/login-form/login-form-schema"
import {
  type RegisterFormValues,
  registerFormSchema,
} from "@/components/forms/auth/register-form/register-form-schema"
import { FormItem } from "@/components/forms/form-item"
import { Button } from "@/components/ui/button"
import { Loader } from "@/components/ui/loader"
import { Typography } from "@/components/ui/typography"
import type {
  HouseholdInvitePreview,
  HouseholdInviteStatus,
} from "@/interfaces/household-invite"
import { logout } from "@/lib/auth/logout"
import { formatDate } from "@/lib/format"
import { queryClient } from "@/lib/query-client"
import { useLoginMutation } from "@/mutations/auth/use-login-mutation"
import { useRegisterMutation } from "@/mutations/auth/use-register-mutation"
import { useAcceptHouseholdInviteMutation } from "@/mutations/households/use-accept-household-invite-mutation"
import { authQueryKeys } from "@/queries/auth/use-auth-providers-query"
import { useProbeCurrentUserQuery } from "@/queries/auth/use-current-user-query"
import { useHouseholdInvitePreviewQuery } from "@/queries/households/use-household-invite-query"
import { householdQueryKeys } from "@/queries/households/use-households-query"
import { hydrateAuthenticatedSession } from "@/services/auth-session.service"
import { AppClientError } from "@/services/error-client"
import { useAuthSessionStore } from "@/stores/auth-session-store"

type AuthMode = "register" | "login"

const roleLabels = {
  owner: "owner",
  admin: "administrator",
  member: "member",
  viewer: "viewer",
} as const

const terminalStatusContent: Record<
  Exclude<HouseholdInviteStatus, "pending">,
  { title: string; description: string }
> = {
  expired: {
    title: "This invitation has expired",
    description:
      "Ask a household administrator to resend the invitation or create a new link.",
  },
  accepted: {
    title: "This invitation was already accepted",
    description:
      "Continue to Luraba and sign in with the account that accepted it.",
  },
  rejected: {
    title: "This invitation was declined",
    description:
      "A household administrator can send another invitation if you still need access.",
  },
  canceled: {
    title: "This invitation was canceled",
    description:
      "This link is no longer active. Ask a household administrator for a new invitation.",
  },
}

function InvitePageShell({
  eyebrow,
  title,
  description,
  footer,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  footer: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <main className="min-h-dvh bg-background px-4 py-8">
      <section className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[29rem] items-center justify-center">
        <div className="w-full space-y-6">
          <AuthPageHeader
            eyebrow={eyebrow}
            title={title}
            description={description}
          />

          <AuthFormFrame footer={footer}>{children}</AuthFormFrame>
        </div>
      </section>
    </main>
  )
}

function InviteContext({ invite }: { invite: HouseholdInvitePreview }) {
  return (
    <div className="rounded-xl border border-border bg-muted/25 px-4 py-3">
      <Typography variant="small-muted">Invited email</Typography>
      <Typography className="mt-1 truncate text-sm font-medium">
        {invite.email}
      </Typography>
    </div>
  )
}

function InlineError({ message }: { message: string }) {
  if (!message) return null

  return <Typography variant="small-destructive">{message}</Typography>
}

function InviteAuthForms({
  invite,
  mode,
  onModeChange,
  onAuthenticated,
}: {
  invite: HouseholdInvitePreview
  mode: AuthMode
  onModeChange: (mode: AuthMode) => void
  onAuthenticated: () => Promise<void>
}) {
  const registerMutation = useRegisterMutation()
  const loginMutation = useLoginMutation()
  const registerForm = useForm<RegisterFormValues>({
    defaultValues: {
      confirmPassword: "",
      email: invite.email,
      name: "",
      password: "",
    },
    resolver: zodResolver(registerFormSchema),
  })
  const loginForm = useForm<LoginFormValues>({
    defaultValues: {
      email: invite.email,
      password: "",
    },
    resolver: zodResolver(loginFormSchema),
  })
  const isPending = registerMutation.isPending || loginMutation.isPending

  const submitRegistration = registerForm.handleSubmit(async (values) => {
    registerMutation.reset()
    try {
      await registerMutation.mutateAsync({
        email: invite.email,
        name: values.name,
        password: values.password,
      })
      await onAuthenticated()
    } catch {
      // Mutation state renders the API error beside the form.
    }
  })

  const submitLogin = loginForm.handleSubmit(async (values) => {
    loginMutation.reset()
    try {
      await loginMutation.mutateAsync({
        email: invite.email,
        password: values.password,
      })
      await onAuthenticated()
    } catch {
      // Mutation state renders the API error beside the form.
    }
  })

  return (
    <div>
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/25 p-1">
        <Button
          type="button"
          variant={mode === "register" ? "secondary" : "ghost"}
          className="h-9 rounded-lg border-transparent shadow-none"
          onClick={() => onModeChange("register")}
        >
          Create account
        </Button>
        <Button
          type="button"
          variant={mode === "login" ? "secondary" : "ghost"}
          className="h-9 rounded-lg border-transparent shadow-none"
          onClick={() => onModeChange("login")}
        >
          Sign in
        </Button>
      </div>

      {mode === "register" ? (
        <form
          key="register"
          className="mt-5 space-y-5"
          onSubmit={submitRegistration}
          noValidate
        >
          <FormItem
            control={registerForm.control}
            name="name"
            label="Name"
            placeholder="Your name"
            autoComplete="name"
            inputClassName="h-10 rounded-xl"
          />
          <FormItem
            control={registerForm.control}
            name="email"
            label="Email"
            inputType="email"
            readOnly
            autoComplete="email"
            inputClassName="h-10 rounded-xl bg-muted/40 text-muted-foreground"
          />
          <div className="grid gap-4 md:grid-cols-2">
            <FormItem
              control={registerForm.control}
              name="password"
              label="Password"
              inputType="password"
              placeholder="Create a password"
              autoComplete="new-password"
              inputClassName="h-10 rounded-xl"
            />
            <FormItem
              control={registerForm.control}
              name="confirmPassword"
              label="Confirm Password"
              inputType="password"
              placeholder="Repeat password"
              autoComplete="new-password"
              inputClassName="h-10 rounded-xl"
            />
          </div>
          <InlineError message={registerMutation.errorMessage} />
          <Button
            type="submit"
            size="lg"
            className="h-10 w-full rounded-xl border-primary/30 bg-primary text-primary-foreground shadow-none hover:brightness-105"
            isLoading={isPending}
            loadingText="Creating account..."
          >
            Create account and join
          </Button>
          {registerMutation.appError?.code.includes("USER_ALREADY_EXISTS") ? (
            <Button
              type="button"
              variant="ghost"
              className="w-full shadow-none"
              onClick={() => onModeChange("login")}
            >
              This email already has an account. Sign in instead
            </Button>
          ) : null}
        </form>
      ) : (
        <form
          key="login"
          className="mt-5 space-y-5"
          onSubmit={submitLogin}
          noValidate
        >
          <FormItem
            control={loginForm.control}
            name="email"
            label="Email"
            inputType="email"
            readOnly
            autoComplete="email"
            inputClassName="h-10 rounded-xl bg-muted/40 text-muted-foreground"
          />
          <FormItem
            control={loginForm.control}
            name="password"
            label="Password"
            inputType="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            inputClassName="h-10 rounded-xl"
          />
          <InlineError message={loginMutation.errorMessage} />
          <Button
            type="submit"
            size="lg"
            className="h-10 w-full rounded-xl border-primary/30 bg-primary text-primary-foreground shadow-none hover:brightness-105"
            isLoading={isPending}
            loadingText="Signing in..."
          >
            Sign in and join
          </Button>
        </form>
      )}
    </div>
  )
}

function TerminalInviteState({
  isAuthenticated,
}: {
  isAuthenticated: boolean
}) {
  return (
    <Button asChild size="lg" className="h-10 w-full rounded-xl shadow-none">
      <a href={isAuthenticated ? "/dashboard" : "/login"}>
        {isAuthenticated ? "Continue to Luraba" : "Go to sign in"}
      </a>
    </Button>
  )
}

function PendingInvitePanel({
  token,
  invite,
}: {
  token: string
  invite: HouseholdInvitePreview
}) {
  const router = useRouter()
  const hydrate = useAuthSessionStore((state) => state.hydrate)
  const setActiveHouseholdId = useAuthSessionStore(
    (state) => state.setActiveHouseholdId,
  )
  const sessionQuery = useProbeCurrentUserQuery()
  const acceptMutation = useAcceptHouseholdInviteMutation()
  const [mode, setMode] = React.useState<AuthMode>("register")
  const [authenticatedEmail, setAuthenticatedEmail] = React.useState<
    string | null
  >(null)
  const sessionEmail =
    authenticatedEmail ?? sessionQuery.data?.user.email ?? null
  const isMatchingSession =
    sessionEmail?.toLowerCase() === invite.email.toLowerCase()

  async function completeAcceptance() {
    acceptMutation.reset()
    try {
      const accepted = await acceptMutation.mutateAsync({ token })
      setActiveHouseholdId(accepted.household.id)
      queryClient.removeQueries({ queryKey: authQueryKeys.session })
      queryClient.removeQueries({ queryKey: householdQueryKeys.lists() })
      await hydrateAuthenticatedSession({ hydrate })
      router.replace("/dashboard")
      router.refresh()
    } catch {
      // The panel keeps the signed-in state and exposes a retry action.
    }
  }

  async function handleAuthenticated() {
    setAuthenticatedEmail(invite.email)
    await completeAcceptance()
  }

  if (sessionQuery.isPending && !authenticatedEmail) {
    return (
      <Loader size="lg" label="Checking your session" className="mx-auto" />
    )
  }

  if (sessionEmail && !isMatchingSession) {
    return (
      <div className="space-y-5">
        <InviteContext invite={invite} />
        <Typography variant="body-muted">
          You&apos;re signed in as {sessionEmail}. Sign in with {invite.email}{" "}
          to accept this invitation.
        </Typography>
        <Button
          size="lg"
          className="h-10 w-full rounded-xl shadow-none"
          onClick={() => logout({ redirectTo: window.location.pathname })}
        >
          Sign in with another account
        </Button>
      </div>
    )
  }

  if (isMatchingSession) {
    return (
      <div className="space-y-5">
        <InviteContext invite={invite} />
        <Typography variant="body-muted">
          You&apos;re signed in with the invited email. Accept to join the
          household.
        </Typography>
        <InlineError message={acceptMutation.errorMessage} />
        <Button
          size="lg"
          className="h-10 w-full rounded-xl shadow-none"
          isLoading={acceptMutation.isPending}
          loadingText="Joining household..."
          onClick={() => void completeAcceptance()}
        >
          Accept invitation
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <InviteContext invite={invite} />
      <InviteAuthForms
        invite={invite}
        mode={mode}
        onModeChange={(nextMode) => {
          acceptMutation.reset()
          setMode(nextMode)
        }}
        onAuthenticated={handleAuthenticated}
      />
      <InlineError message={acceptMutation.errorMessage} />
    </div>
  )
}

function InvalidInviteState({
  retry,
  isMissing,
}: {
  retry: () => void
  isMissing: boolean
}) {
  return (
    <InvitePageShell
      eyebrow="Invitation unavailable"
      title={
        isMissing
          ? "This invitation link isn't valid"
          : "We couldn't load this invitation"
      }
      description={
        isMissing
          ? "The link may have been replaced or copied incorrectly. Ask for a new invitation."
          : "Check your connection and try loading the invitation again."
      }
      footer="Household invitations can only be used by the invited email."
    >
      <Button
        variant={isMissing ? "outline" : "default"}
        size="lg"
        className="h-10 w-full rounded-xl shadow-none"
        onClick={retry}
      >
        {isMissing ? "Go to sign in" : "Try again"}
      </Button>
    </InvitePageShell>
  )
}

export function InviteOnboarding({ token }: { token: string }) {
  const previewQuery = useHouseholdInvitePreviewQuery(token)
  const sessionQuery = useProbeCurrentUserQuery()

  if (previewQuery.isPending) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background">
        <Loader fullPage size="lg" label="Opening invitation" />
      </main>
    )
  }

  if (previewQuery.isError || !previewQuery.data) {
    const isMissing =
      previewQuery.error instanceof AppClientError &&
      previewQuery.error.status === 404
    return (
      <InvalidInviteState
        isMissing={isMissing}
        retry={() => {
          if (isMissing) {
            window.location.assign("/login")
            return
          }
          void previewQuery.refetch()
        }}
      />
    )
  }

  const invite = previewQuery.data
  const inviterName = invite.inviter?.name ?? "A household administrator"
  const content =
    invite.status === "pending" ? null : terminalStatusContent[invite.status]

  return (
    <InvitePageShell
      eyebrow="Household invitation"
      title={content?.title ?? `Join ${invite.household.name}`}
      description={
        content?.description ??
        `${inviterName} invited you to join as ${roleLabels[invite.role]}.`
      }
      footer={
        invite.status === "pending"
          ? `Invitation expires ${formatDate(invite.expiresAt, {
              formatString: "MMM d, yyyy 'at' h:mm a",
            })}.`
          : `Invitation sent to ${invite.email}.`
      }
    >
      {invite.status === "pending" ? (
        <PendingInvitePanel token={token} invite={invite} />
      ) : (
        <TerminalInviteState isAuthenticated={Boolean(sessionQuery.data)} />
      )}
    </InvitePageShell>
  )
}
