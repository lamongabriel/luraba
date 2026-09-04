"use client"

import { Add01Icon, Delete02Icon, Edit02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type {
  CreateHouseholdInput,
  CreateHouseholdInviteInput,
} from "@luraba/contracts"
import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"
import { ErrorState } from "@/components/error-state"
import { InfoItem } from "@/components/finance/info-item"
import { PageHeader } from "@/components/finance/page-header"
import { HouseholdDeleteDialog } from "@/components/households/household-delete-dialog"
import { HouseholdInvitationsTable } from "@/components/households/household-invitations-table"
import { HouseholdInviteSheet } from "@/components/households/household-invite-sheet"
import { HouseholdMembersTable } from "@/components/households/household-members-table"
import { HouseholdSettingsSheet } from "@/components/households/household-settings-sheet"
import { PageReveal } from "@/components/motion/reveal"
import { Button } from "@/components/ui/button"
import { Typography } from "@/components/ui/typography"
import { canManageHousehold } from "@/lib/households"
import { formatTimezoneLabel } from "@/lib/timezones"
import {
  useCreateHouseholdInviteMutation,
  useDeleteHouseholdMutation,
  useUpdateHouseholdMutation,
} from "@/mutations/households/use-household-mutations"
import { householdInviteQueryKeys } from "@/queries/households/use-household-invite-query"
import {
  householdQueryKeys,
  useHouseholdQuery,
  useHouseholdRolesQuery,
} from "@/queries/households/use-households-query"
import { useLocationOptionsQuery } from "@/queries/reference-data/use-location-options-query"
import { useAuthSessionStore } from "@/stores/auth-session-store"

function SectionHeader({ title }: { title: string }) {
  return (
    <Typography as="h2" variant="section-title">
      {title}
    </Typography>
  )
}

export function HouseholdManagement({ householdId }: { householdId: string }) {
  const router = useRouter()
  const client = useQueryClient()
  const activeHouseholdId = useAuthSessionStore(
    (state) => state.activeHouseholdId,
  )
  const setActiveHouseholdId = useAuthSessionStore(
    (state) => state.setActiveHouseholdId,
  )
  const query = useHouseholdQuery(householdId)
  const rolesQuery = useHouseholdRolesQuery()
  const locationOptionsQuery = useLocationOptionsQuery()
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [inviteOpen, setInviteOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const update = useUpdateHouseholdMutation({
    onSuccess: async () => {
      setSettingsOpen(false)
      toast.success("Household settings updated")
      await client.invalidateQueries({ queryKey: householdQueryKeys.all })
    },
  })
  const invite = useCreateHouseholdInviteMutation({
    onSuccess: async () => {
      setInviteOpen(false)
      toast.success("Invitation sent")
      await client.invalidateQueries({
        queryKey: householdInviteQueryKeys.lists(),
      })
    },
  })
  const remove = useDeleteHouseholdMutation({
    onSuccess: async () => {
      if (householdId === activeHouseholdId) setActiveHouseholdId("")
      setDeleteOpen(false)
      await client.invalidateQueries({ queryKey: householdQueryKeys.all })
      router.push("/households")
    },
  })
  const household = query.data

  if (query.isPending) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-lg bg-muted" />
        <div className="h-80 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (query.isError || !household) {
    return (
      <ErrorState
        title="Couldn't load this household"
        description={
          query.error?.message ?? "The household may no longer be available."
        }
        onRetry={() => void query.refetch()}
      />
    )
  }

  const canManage = canManageHousehold(household.role, rolesQuery.data ?? [])
  const canUpdateHousehold = household.role === "owner"
  const countryName =
    locationOptionsQuery.data?.countries.find(
      (country) => country.code === household.countryCode,
    )?.name ?? household.countryCode

  return (
    <>
      <PageReveal className="min-w-0 max-w-full space-y-8">
        <PageHeader
          title={household.name}
          description={
            household.description ||
            "A shared household workspace for organizing finances."
          }
          backHref="/households"
          backText="All households"
          actions={
            <div className="flex items-center gap-1.5">
              {canUpdateHousehold ? (
                <Button
                  variant="ghost"
                  size="icon"
                  title="Household settings"
                  aria-label="Household settings"
                  onClick={() => setSettingsOpen(true)}
                >
                  <HugeiconsIcon icon={Edit02Icon} strokeWidth={2} />
                </Button>
              ) : null}
              {household.role === "owner" ? (
                <Button
                  variant="ghost"
                  size="icon"
                  title="Delete household"
                  aria-label="Delete household"
                  onClick={() => setDeleteOpen(true)}
                  className="text-destructive hover:text-destructive"
                >
                  <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                </Button>
              ) : null}
              {canManage ? (
                <Button onClick={() => setInviteOpen(true)}>
                  <HugeiconsIcon icon={Add01Icon} strokeWidth={2} /> Invite
                  member
                </Button>
              ) : null}
            </div>
          }
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem
            label="Default currency"
            value={household.defaultCurrencyId}
          />
          <InfoItem label="Country" value={countryName} />
          <InfoItem
            label="Time zone"
            value={formatTimezoneLabel(household.timezone)}
          />
        </div>
        <section className="space-y-4">
          <SectionHeader title="Members" />
          <HouseholdMembersTable
            householdId={household.id}
            householdRole={household.role}
          />
        </section>
        <section className="space-y-4">
          <SectionHeader title="Outgoing invitations" />
          <HouseholdInvitationsTable
            householdId={household.id}
            householdRole={household.role}
          />
        </section>
      </PageReveal>
      <HouseholdSettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        household={household}
        onSubmit={(body: CreateHouseholdInput) =>
          update.mutate({ householdId: household.id, body })
        }
        isPending={update.isPending}
      />
      <HouseholdInviteSheet
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSubmit={(body: CreateHouseholdInviteInput) =>
          invite.mutate({ householdId: household.id, body })
        }
        isPending={invite.isPending}
      />
      <HouseholdDeleteDialog
        householdName={household.name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={() => remove.mutate(household.id)}
        isPending={remove.isPending}
      />
    </>
  )
}
