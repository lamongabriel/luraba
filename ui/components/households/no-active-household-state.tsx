"use client"

import { Add01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import * as React from "react"

import { AuthPageHeader } from "@/components/auth/auth-page-header"
import { AuthFormFrame } from "@/components/forms/auth/auth-form-frame"
import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import { queryClient } from "@/lib/query-client"
import { useCreateHouseholdMutation } from "@/mutations/households/use-household-mutations"
import { authQueryKeys } from "@/queries/auth/use-auth-providers-query"
import { householdQueryKeys } from "@/queries/households/use-households-query"
import { useAuthSessionStore } from "@/stores/auth-session-store"

type PendingAction = "create" | string | null

export function NoActiveHouseholdState() {
  const households = useAuthSessionStore((state) => state.households)
  const user = useAuthSessionStore((state) => state.user)
  const setActiveHouseholdId = useAuthSessionStore(
    (state) => state.setActiveHouseholdId,
  )
  const createHouseholdMutation = useCreateHouseholdMutation()
  const [pendingAction, setPendingAction] = React.useState<PendingAction>(null)
  const [isTransitioning, startTransition] = React.useTransition()
  const isPending = isTransitioning || createHouseholdMutation.isPending

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: authQueryKeys.session }),
      queryClient.invalidateQueries({ queryKey: householdQueryKeys.all }),
    ])
  }

  function activateHousehold(householdId: string) {
    setPendingAction(householdId)
    startTransition(async () => {
      try {
        setActiveHouseholdId(householdId)
        await refresh()
      } finally {
        setPendingAction(null)
      }
    })
  }

  function handleCreateHousehold() {
    const firstName = user?.name.trim().split(/\s+/)[0]
    const name = firstName ? `${firstName}'s household` : "My household"

    createHouseholdMutation.reset()
    setPendingAction("create")
    startTransition(async () => {
      try {
        const household = await createHouseholdMutation.mutateAsync({ name })
        setActiveHouseholdId(household.id)
        await refresh()
      } catch {
        // The mutation error remains visible so the user can retry.
      } finally {
        setPendingAction(null)
      }
    })
  }

  return (
    <main className="min-h-dvh bg-background px-4 py-8">
      <section className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[29rem] items-center justify-center">
        <div className="w-full space-y-6">
          <AuthPageHeader
            eyebrow="Workspace required"
            title="Choose a household"
            description="Select the household you want to open, or create a new one."
          />

          <AuthFormFrame footer="You can switch households later from the sidebar.">
            <div className="space-y-4">
              {households.length > 0 ? (
                <div className="space-y-2">
                  {households.map((household) => (
                    <Button
                      key={household.id}
                      type="button"
                      variant="outline"
                      className="h-auto min-h-14 w-full justify-between rounded-xl border-white/8 bg-background/30 px-3 py-2.5 text-left hover:bg-muted/70"
                      disabled={isPending}
                      isLoading={isPending && pendingAction === household.id}
                      loadingText={`Opening ${household.name}...`}
                      onClick={() => activateHousehold(household.id)}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                          {household.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {household.name}
                          </span>
                          <span className="block text-[0.68rem] capitalize text-muted-foreground">
                            {household.role}
                          </span>
                        </span>
                      </span>
                      <HugeiconsIcon
                        icon={ArrowRight01Icon}
                        size={15}
                        strokeWidth={2}
                        className="text-muted-foreground"
                      />
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 bg-background/25 px-4 py-5 text-center">
                  <Typography variant="body-muted">
                    You don&apos;t have a household yet. Create one to start
                    using Luraba.
                  </Typography>
                </div>
              )}

              {createHouseholdMutation.errorMessage ? (
                <Typography variant="small-destructive" className="text-center">
                  {createHouseholdMutation.errorMessage}
                </Typography>
              ) : null}

              <Button
                type="button"
                size="lg"
                variant={households.length > 0 ? "outline" : "default"}
                className="h-10 w-full rounded-xl shadow-none"
                disabled={isPending}
                isLoading={isPending && pendingAction === "create"}
                loadingText="Creating household..."
                onClick={handleCreateHousehold}
              >
                <HugeiconsIcon
                  icon={Add01Icon}
                  size={16}
                  strokeWidth={2}
                  data-icon="inline-start"
                />
                Create a new household
              </Button>
            </div>
          </AuthFormFrame>
        </div>
      </section>
    </main>
  )
}
