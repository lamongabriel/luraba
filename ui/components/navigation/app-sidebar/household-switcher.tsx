"use client"

import * as React from "react"
import { ArrowRight01Icon, SparklesIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { motion } from "framer-motion"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar"
import { Typography } from "@/components/ui/typography"
import type { AuthUser } from "@/interfaces/auth"
import type { HouseholdContext, HouseholdSummary } from "@/interfaces/household"
import { readStorage, STORAGE_KEYS, writeStorage } from "@/lib/local-storage"

const HOUSEHOLD_CHANGED_EVENT = "luraba:household-change"

type HouseholdWorkspace = HouseholdSummary & {
  permissions?: string[]
}

interface HouseholdSwitcherProps {
  user: AuthUser
  initialHousehold: HouseholdContext
  households: HouseholdSummary[]
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function createFallbackDescription(household: HouseholdWorkspace) {
  return `${household.defaultCurrencyId} budgeting for ${household.countryCode} in ${household.timezone.replaceAll("_", " ")}.`
}

function mergeHouseholds(
  initialHousehold: HouseholdContext,
  households: HouseholdSummary[],
): HouseholdWorkspace[] {
  const map = new Map<string, HouseholdWorkspace>()

  for (const household of households) {
    map.set(household.id, { ...household })
  }

  const existing = map.get(initialHousehold.id)

  map.set(initialHousehold.id, {
    id: initialHousehold.id,
    name: initialHousehold.name,
    description: existing?.description ?? "Primary household workspace.",
    role: initialHousehold.role,
    createdByUserId: existing?.createdByUserId ?? "preview-user",
    createdAt: existing?.createdAt ?? new Date("2026-06-11T01:38:36.604Z").toISOString(),
    updatedAt: existing?.updatedAt ?? new Date("2026-06-11T01:38:36.604Z").toISOString(),
    defaultCurrencyId: initialHousehold.settings.defaultCurrencyId,
    countryCode: initialHousehold.settings.countryCode,
    timezone: initialHousehold.settings.timezone,
    budgetMonthStartsOn: initialHousehold.settings.budgetMonthStartsOn,
    creditExpenseTiming: initialHousehold.settings.creditExpenseTiming,
    creditInstallmentBudgetMode: initialHousehold.settings.creditInstallmentBudgetMode,
    permissions: initialHousehold.permissions,
  })

  return Array.from(map.values())
}

export function HouseholdSwitcher({
  user,
  initialHousehold,
  households: initialHouseholds,
}: HouseholdSwitcherProps) {
  const { isMobile } = useSidebar()
  const seedHouseholds = React.useMemo(
    () => mergeHouseholds(initialHousehold, initialHouseholds),
    [initialHousehold, initialHouseholds],
  )
  const [households, setHouseholds] = React.useState<HouseholdWorkspace[]>(seedHouseholds)
  const [selectedHouseholdId, setSelectedHouseholdId] = React.useState(
    initialHousehold.id,
  )

  React.useEffect(() => {
    setHouseholds(seedHouseholds)
    setSelectedHouseholdId((current) => current || initialHousehold.id)
  }, [initialHousehold.id, seedHouseholds])

  React.useEffect(() => {
    const storedHouseholds = readStorage(STORAGE_KEYS.households)
    const storedSelectedId =
      readStorage(STORAGE_KEYS.activeHouseholdId) ||
      user.defaultHouseholdId ||
      initialHousehold.id

    const merged = mergeHouseholds(initialHousehold, [
      ...initialHouseholds,
      ...storedHouseholds,
    ])

    setHouseholds(merged)
    setSelectedHouseholdId(storedSelectedId)
  }, [initialHousehold, initialHouseholds, user.defaultHouseholdId])

  React.useEffect(() => {
    if (typeof window === "undefined" || households.length === 0 || !selectedHouseholdId) {
      return
    }

    const activeHousehold =
      households.find((household) => household.id === selectedHouseholdId) ?? households[0]

    writeStorage(STORAGE_KEYS.households, households)
    writeStorage(STORAGE_KEYS.activeHouseholdId, activeHousehold.id)

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(HOUSEHOLD_CHANGED_EVENT, {
          detail: {
            householdId: activeHousehold.id,
            household: activeHousehold,
          },
        }),
      )
    }
  }, [households, selectedHouseholdId])

  const selectedHousehold = React.useMemo(() => {
    return (
      households.find((household) => household.id === selectedHouseholdId) ??
      households.find((household) => household.id === user.defaultHouseholdId) ??
      households[0]
    )
  }, [households, selectedHouseholdId, user.defaultHouseholdId])

  const handleCreateHousehold = React.useCallback(() => {
    const now = new Date().toISOString()
    const sequence = households.filter((household) =>
      household.name.startsWith("New Household"),
    ).length + 1
    const baseHousehold = selectedHousehold ?? households[0]

    const nextHousehold: HouseholdWorkspace = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `household-${Date.now()}`,
      name: `New Household ${sequence}`,
      description: "A fresh shared workspace for another budgeting setup.",
      defaultCurrencyId: baseHousehold?.defaultCurrencyId ?? user.preferences.currency,
      countryCode: baseHousehold?.countryCode ?? "BR",
      timezone: baseHousehold?.timezone ?? user.preferences.timezone,
      budgetMonthStartsOn: baseHousehold?.budgetMonthStartsOn ?? 1,
      creditExpenseTiming: baseHousehold?.creditExpenseTiming ?? "spend_month",
      creditInstallmentBudgetMode:
        baseHousehold?.creditInstallmentBudgetMode ?? "per_installment",
      role: "owner",
      createdByUserId: user.id,
      createdAt: now,
      updatedAt: now,
      permissions: [],
    }

    setHouseholds((current) => [nextHousehold, ...current])
    setSelectedHouseholdId(nextHousehold.id)
  }, [households, selectedHousehold, user.id, user.preferences.currency, user.preferences.timezone])

  if (!selectedHousehold) {
    return null
  }

  const initials = getInitials(selectedHousehold.name)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.div whileHover={{ y: -1, scale: 1.01 }} whileTap={{ scale: 0.985 }}>
              <SidebarMenuButton
                size="lg"
                className="h-11 rounded-xl border border-sidebar-border/70 bg-card/80 px-2.5 py-2 shadow-sm hover:bg-accent/60"
              >
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                  <Typography as="span" variant="small" className="text-[0.62rem] font-semibold text-primary-foreground">
                    {initials}
                  </Typography>
                </div>

                <div className="min-w-0 flex-1 text-left">
                  <Typography as="span" variant="sidebar-title" truncate className="block text-[0.86rem] font-medium text-foreground">
                    {selectedHousehold.name}
                  </Typography>
                </div>

                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  strokeWidth={2}
                  className="ml-auto size-3.5 rotate-90 text-muted-foreground"
                />
              </SidebarMenuButton>
            </motion.div>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side={isMobile ? "bottom" : "right"}
            align="start"
            sideOffset={10}
            className="w-64 rounded-[1.15rem] border-border/70 bg-card/95 p-0 shadow-[0_20px_50px_rgba(0,0,0,0.4)]"
          >
            <DropdownMenuLabel className="border-b border-border/60 px-3 py-2.5 font-normal">
              <Typography as="span" variant="small-muted" className="block text-[0.72rem] text-foreground/68">
                {user.email}
              </Typography>
            </DropdownMenuLabel>

            <DropdownMenuRadioGroup value={selectedHousehold.id} onValueChange={setSelectedHouseholdId}>
              {households.map((household) => (
                <DropdownMenuRadioItem
                  key={household.id}
                  value={household.id}
                  className="items-center gap-2.5 rounded-none px-3 py-3 first:mt-1"
                >
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                    <Typography as="span" variant="small" className="text-[0.62rem] font-semibold text-primary-foreground">
                      {getInitials(household.name)}
                    </Typography>
                  </div>

                  <div className="min-w-0 flex-1">
                    <Typography as="span" variant="small-strong" className="block truncate text-[0.84rem] font-medium text-foreground">
                      {household.name}
                    </Typography>
                    <Typography as="span" variant="small-muted" className="block truncate text-[0.68rem] text-muted-foreground/72">
                      {household.description ?? createFallbackDescription(household)}
                    </Typography>
                  </div>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>

            <DropdownMenuSeparator className="my-0" />

            <DropdownMenuItem onSelect={handleCreateHousehold} className="rounded-none px-3 py-3 text-[0.82rem] text-muted-foreground">
              <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-3.5" />
              New household
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
