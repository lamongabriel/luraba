"use client";

import { Add01Icon, ArrowRight01Icon, Tick02Icon, ViewIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  HOUSEHOLD_ROLE_METADATA,
  type HouseholdContext,
  type HouseholdSummary,
  type User,
} from "@luraba/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as React from "react";
import { HouseholdMark } from "@/components/display";
import { HouseholdSettingsSheet } from "@/components/households/household-settings-sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { useCreateHouseholdMutation } from "@/mutations/households/use-household-mutations";
import { authQueryKeys } from "@/queries/auth/use-auth-providers-query";
import { householdQueryKeys } from "@/queries/households/use-households-query";

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
    imageUploadId: existing?.imageUploadId ?? null,
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
  const router = useRouter();
  const client = useQueryClient();
  const [createOpen, setCreateOpen] = React.useState(false);
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

  const select = React.useCallback(
    (householdId: string) => {
      setSelectedHouseholdId(householdId);
      onHouseholdChange?.(householdId);
    },
    [onHouseholdChange],
  );
  const create = useCreateHouseholdMutation({
    onSuccess: async (created) => {
      setCreateOpen(false);
      await Promise.all([
        client.invalidateQueries({ queryKey: authQueryKeys.session }),
        client.invalidateQueries({ queryKey: householdQueryKeys.all }),
      ]);
      select(created.id);
    },
  });

  if (!selectedHousehold) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="h-11 rounded-xl border border-sidebar-border/70 bg-card/80 px-2.5 py-2 hover:bg-accent/60"
            >
              <HouseholdMark
                key={selectedHousehold.id}
                household={selectedHousehold}
                size="md"
                className="size-7 rounded-lg duration-300 animate-in fade-in zoom-in-75"
              />

              <div
                key={selectedHousehold.id}
                className="min-w-0 flex-1 text-left duration-300 animate-in fade-in slide-in-from-left-1"
              >
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

            <div className="p-1">
              {households.map((household) => {
                const active = household.id === selectedHousehold.id;
                return (
                  <DropdownMenuItem
                    key={household.id}
                    onSelect={() => select(household.id)}
                    className="group/household gap-2.5 rounded-lg px-2 py-2 transition-colors duration-200"
                  >
                    <HouseholdMark household={household} size="md" className="rounded-lg" />
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
                        className="block truncate text-[0.68rem] text-muted-foreground"
                      >
                        {HOUSEHOLD_ROLE_METADATA[household.role].label}
                      </Typography>
                    </div>
                    <button
                      type="button"
                      title="View household"
                      aria-label={`View ${household.name}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        select(household.id);
                        router.push("/household");
                      }}
                      className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-foreground/10 hover:text-foreground focus-visible:opacity-100 group-hover/household:opacity-100 group-data-highlighted/household:opacity-100"
                    >
                      <HugeiconsIcon icon={ViewIcon} strokeWidth={2} className="size-3.5" />
                    </button>
                    {active ? (
                      <HugeiconsIcon
                        icon={Tick02Icon}
                        strokeWidth={2.4}
                        className="size-3.5 text-primary duration-200 animate-in zoom-in-50 fade-in"
                      />
                    ) : null}
                  </DropdownMenuItem>
                );
              })}
            </div>
            <DropdownMenuSeparator className="my-0" />
            <div className="p-1">
              <DropdownMenuItem
                className="gap-2 rounded-lg px-2 py-2"
                onSelect={() => setCreateOpen(true)}
              >
                <HugeiconsIcon icon={Add01Icon} strokeWidth={1.8} />
                New household
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        <HouseholdSettingsSheet
          open={createOpen}
          onOpenChange={setCreateOpen}
          mode="create"
          onSubmit={(body) => create.mutate(body)}
          isPending={create.isPending}
        />
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
