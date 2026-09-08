"use client";

import { ArrowRight01Icon, Settings02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { HouseholdContext, HouseholdSummary, User } from "@luraba/contracts";
import Link from "next/link";
import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Typography } from "@/components/ui/typography";
import { STORAGE_KEYS } from "@/config/storage";
import { readStorage, writeStorage } from "@/lib/local-storage";

const HOUSEHOLD_CHANGED_EVENT = "luraba:household-change";
const FALLBACK_HOUSEHOLD_TIMESTAMP = "2026-06-11T01:38:36.604Z";

type HouseholdWorkspace = HouseholdSummary & {
  permissions?: string[];
};

interface HouseholdSwitcherProps {
  user: User;
  initialHousehold: HouseholdContext;
  households: HouseholdSummary[];
  onHouseholdChange?: (householdId: string) => void;
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function createFallbackDescription(household: HouseholdWorkspace) {
  return `${household.defaultCurrencyId} budgeting for ${household.countryCode} in ${household.timezone.replaceAll("_", " ")}.`;
}

function mergeHouseholds(
  initialHousehold: HouseholdContext,
  households: HouseholdSummary[],
): HouseholdWorkspace[] {
  const map = new Map<string, HouseholdWorkspace>();

  for (const household of households) {
    map.set(household.id, { ...household });
  }

  const existing = map.get(initialHousehold.id);

  map.set(initialHousehold.id, {
    id: initialHousehold.id,
    name: initialHousehold.name,
    description: existing?.description ?? "Primary household workspace.",
    role: initialHousehold.role,
    createdByUserId: existing?.createdByUserId ?? initialHousehold.id,
    createdAt: existing?.createdAt ?? FALLBACK_HOUSEHOLD_TIMESTAMP,
    updatedAt: existing?.updatedAt ?? FALLBACK_HOUSEHOLD_TIMESTAMP,
    defaultCurrencyId: initialHousehold.settings.defaultCurrencyId,
    countryCode: initialHousehold.settings.countryCode,
    timezone: initialHousehold.settings.timezone,
    budgetMonthStartsOn: initialHousehold.settings.budgetMonthStartsOn,
    creditExpenseTiming: initialHousehold.settings.creditExpenseTiming,
    creditInstallmentBudgetMode: initialHousehold.settings.creditInstallmentBudgetMode,
    permissions: initialHousehold.permissions,
  });

  return Array.from(map.values());
}

export function HouseholdSwitcher({
  user,
  initialHousehold,
  households: initialHouseholds,
  onHouseholdChange,
}: HouseholdSwitcherProps) {
  const { isMobile } = useSidebar();
  const households = React.useMemo(
    () => mergeHouseholds(initialHousehold, initialHouseholds),
    [initialHousehold, initialHouseholds],
  );
  const [selectedHouseholdId, setSelectedHouseholdId] = React.useState(
    () =>
      readStorage(STORAGE_KEYS.activeHouseholdId) || user.defaultHouseholdId || initialHousehold.id,
  );

  const selectedHousehold = React.useMemo(() => {
    return (
      households.find((household) => household.id === selectedHouseholdId) ??
      households.find((household) => household.id === initialHousehold.id) ??
      households.find((household) => household.id === user.defaultHouseholdId) ??
      households[0]
    );
  }, [households, initialHousehold.id, selectedHouseholdId, user.defaultHouseholdId]);

  React.useEffect(() => {
    if (!selectedHousehold || typeof window === "undefined") return;

    writeStorage(STORAGE_KEYS.activeHouseholdId, selectedHousehold.id);
    window.dispatchEvent(
      new CustomEvent(HOUSEHOLD_CHANGED_EVENT, {
        detail: {
          householdId: selectedHousehold.id,
          household: selectedHousehold,
        },
      }),
    );
  }, [selectedHousehold]);

  if (!selectedHousehold) {
    return null;
  }

  const initials = getInitials(selectedHousehold.name);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="h-11 rounded-xl border border-sidebar-border/70 bg-card/80 px-2.5 py-2 hover:bg-accent/60"
            >
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Typography
                  as="span"
                  variant="small"
                  className="text-[0.62rem] font-semibold text-primary-foreground"
                >
                  {initials}
                </Typography>
              </div>

              <div className="min-w-0 flex-1 text-left">
                <Typography
                  as="span"
                  variant="sidebar-title"
                  truncate
                  className="block text-[0.86rem] font-medium text-foreground"
                >
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
            className="w-64 rounded-[1.15rem] border-border/70 bg-card/95 p-0"
          >
            <DropdownMenuLabel className="border-b border-border/60 px-3 py-2.5 font-normal">
              <Typography
                as="span"
                variant="body"
                className="block text-[0.72rem] text-foreground/68"
              >
                Households
              </Typography>
            </DropdownMenuLabel>

            <DropdownMenuRadioGroup
              value={selectedHousehold.id}
              onValueChange={(householdId) => {
                setSelectedHouseholdId(householdId);
                onHouseholdChange?.(householdId);
              }}
            >
              {households.map((household) => (
                <DropdownMenuRadioItem
                  key={household.id}
                  value={household.id}
                  className="items-center gap-2.5 rounded-none px-3 py-3 first:mt-1"
                >
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Typography
                      as="span"
                      variant="small"
                      className="text-[0.62rem] font-semibold text-primary-foreground"
                    >
                      {getInitials(household.name)}
                    </Typography>
                  </div>

                  <div className="min-w-0 flex-1">
                    <Typography
                      as="span"
                      variant="small-strong"
                      className="block truncate text-[0.84rem] font-medium text-foreground"
                    >
                      {household.name}
                    </Typography>
                    <Typography
                      as="span"
                      variant="small-muted"
                      className="block truncate text-[0.68rem] text-muted-foreground/72"
                    >
                      {household.description ?? createFallbackDescription(household)}
                    </Typography>
                  </div>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="gap-2 px-3 py-2.5">
              <Link href="/households">
                <HugeiconsIcon icon={Settings02Icon} strokeWidth={1.8} />
                Manage households
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
