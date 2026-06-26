"use client"

import * as React from "react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar"
import { Typography } from "@/components/ui/typography"
import { STORAGE_KEYS } from "@/config/storage"
import type { HouseholdContext, HouseholdSummary } from "@/interfaces/household"
import type { User } from "@/interfaces/user"
import { readStorage, writeStorage } from "@/lib/local-storage"

const HOUSEHOLD_CHANGED_EVENT = "luraba:household-change"

type HouseholdWorkspace = HouseholdSummary & {
  permissions?: string[]
}

interface HouseholdSwitcherProps {
  user: User
  initialHousehold: HouseholdContext
  households: HouseholdSummary[]
  onHouseholdChange?: (householdId: string) => void
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
  onHouseholdChange,
}: HouseholdSwitcherProps) {
  const { isMobile } = useSidebar()
  const households = React.useMemo(
    () => mergeHouseholds(initialHousehold, initialHouseholds),
    [initialHousehold, initialHouseholds],
  )
  const [selectedHouseholdId, setSelectedHouseholdId] = React.useState(
    () =>
      readStorage(STORAGE_KEYS.activeHouseholdId) ||
      user.defaultHouseholdId ||
      initialHousehold.id,
  )

  const selectedHousehold = React.useMemo(() => {
    return (
      households.find((household) => household.id === selectedHouseholdId) ??
      households.find((household) => household.id === user.defaultHouseholdId) ??
      households[0]
    )
  }, [households, selectedHouseholdId, user.defaultHouseholdId])

  React.useEffect(() => {
    if (typeof window === "undefined" || households.length === 0 || !selectedHousehold) {
      return
    }

    writeStorage(STORAGE_KEYS.activeHouseholdId, selectedHousehold.id)

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(HOUSEHOLD_CHANGED_EVENT, {
          detail: {
            householdId: selectedHousehold.id,
            household: selectedHousehold,
          },
        }),
      )
    }
  }, [households, selectedHousehold])

  if (!selectedHousehold) {
    return null
  }

  const initials = getInitials(selectedHousehold.name)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
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
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side={isMobile ? "bottom" : "right"}
            align="start"
            sideOffset={10}
            className="w-64 rounded-[1.15rem] border-border/70 bg-card/95 p-0 shadow-[0_20px_50px_rgba(0,0,0,0.4)]"
          >
            <DropdownMenuLabel className="border-b border-border/60 px-3 py-2.5 font-normal">
              <Typography as="span" variant="body" className="block text-[0.72rem] text-foreground/68">
                Households
              </Typography>
            </DropdownMenuLabel>

            <DropdownMenuRadioGroup
              value={selectedHousehold.id}
              onValueChange={(householdId) => {
                setSelectedHouseholdId(householdId)
                onHouseholdChange?.(householdId)
              }}
            >
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
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
