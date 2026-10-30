"use client";

import { Delete02Icon, Edit02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { type CreateHouseholdInput, PERMISSIONS } from "@luraba/contracts";
import { formatDate } from "@luraba/domain";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { HouseholdMark, MemberDisplay } from "@/components/display";
import { ErrorState } from "@/components/error-state";
import { InfoItem } from "@/components/finance/info-item";
import { HouseholdDeleteDialog } from "@/components/households/household-delete-dialog";
import { HouseholdSettingsSheet } from "@/components/households/household-settings-sheet";
import { useCan } from "@/components/permissions/use-can";
import { SectionCard, SectionFields } from "@/components/section/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { EntityImageField } from "@/components/uploads/entity-image-field";
import { CREDIT_EXPENSE_TIMING_OPTIONS, CREDIT_INSTALLMENT_MODE_OPTIONS } from "@/lib/budgets";
import { getHouseholdRoleLabel } from "@/lib/households";
import { formatTimezoneLabel } from "@/lib/timezones";
import {
  useDeleteHouseholdMutation,
  useUpdateHouseholdMutation,
} from "@/mutations/households/use-household-mutations";
import {
  householdQueryKeys,
  useHouseholdQuery,
  useHouseholdRolesQuery,
} from "@/queries/households/use-households-query";
import { useLocationOptionsQuery } from "@/queries/reference-data/use-location-options-query";
import { useAuthSessionStore } from "@/stores/auth-session-store";

/** The active household's profile (`/household`): picture, identity and how it is set up. */
export function HouseholdProfile() {
  const router = useRouter();
  const client = useQueryClient();
  const householdId = useAuthSessionStore((state) => state.activeHouseholdId);
  const setActiveHouseholdId = useAuthSessionStore((state) => state.setActiveHouseholdId);
  const can = useCan();
  const query = useHouseholdQuery(householdId);
  const rolesQuery = useHouseholdRolesQuery();
  const locationOptionsQuery = useLocationOptionsQuery();
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const update = useUpdateHouseholdMutation({
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: householdQueryKeys.all });
    },
  });
  const remove = useDeleteHouseholdMutation({
    onSuccess: async () => {
      setActiveHouseholdId("");
      setDeleteOpen(false);
      await client.invalidateQueries({ queryKey: householdQueryKeys.all });
      router.push("/households");
    },
  });
  const household = query.data;

  if (query.isPending) {
    return (
      <div className="space-y-5">
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
        <div className="h-28 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (query.isError || !household) {
    return (
      <ErrorState
        title="Couldn't load this household"
        description={query.error?.message ?? "The household may no longer be available."}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const canEdit = can(PERMISSIONS.HOUSEHOLD_UPDATE);
  const canDelete = can(PERMISSIONS.HOUSEHOLD_DELETE);
  const countryName =
    locationOptionsQuery.data?.countries.find((country) => country.code === household.countryCode)
      ?.name ?? household.countryCode;
  const timingLabel =
    CREDIT_EXPENSE_TIMING_OPTIONS.find((option) => option.value === household.creditExpenseTiming)
      ?.label ?? household.creditExpenseTiming;
  const installmentLabel =
    CREDIT_INSTALLMENT_MODE_OPTIONS.find(
      (option) => option.value === household.creditInstallmentBudgetMode,
    )?.label ?? household.creditInstallmentBudgetMode;
  const mark = (
    <HouseholdMark household={household} size="lg" className="size-20 rounded-2xl text-2xl" />
  );
  const identity = (
    <div className="min-w-0">
      <Typography as="h2" variant="section-title" className="truncate">
        {household.name}
      </Typography>
      <Typography variant="small-muted" className="mt-1 line-clamp-3">
        {household.description || "No description yet."}
      </Typography>
      <Badge variant="outline" className="mt-2">
        You are {getHouseholdRoleLabel(household.role, rolesQuery.data ?? [])}
      </Badge>
    </div>
  );

  return (
    <>
      <SectionCard
        title="Identity"
        description="The picture, name and description shown for this household."
        actions={
          canEdit || canDelete ? (
            <>
              {canEdit ? (
                <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
                  <HugeiconsIcon icon={Edit02Icon} strokeWidth={2} /> Edit
                </Button>
              ) : null}
              {canDelete ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Delete household"
                  aria-label="Delete household"
                  onClick={() => setDeleteOpen(true)}
                  className="text-destructive hover:text-destructive"
                >
                  <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                </Button>
              ) : null}
            </>
          ) : null
        }
      >
        {canEdit ? (
          <EntityImageField
            targetType="household"
            permission={PERMISSIONS.HOUSEHOLD_UPDATE}
            targetId={household.id}
            attachmentRole="logo"
            noun="picture"
            uploadId={household.imageUploadId}
            preview={mark}
            onChange={(imageUploadId) =>
              update.mutateAsync({ householdId: household.id, body: { imageUploadId } })
            }
          >
            {identity}
          </EntityImageField>
        ) : (
          <div className="flex items-center gap-4">
            {mark}
            {identity}
          </div>
        )}
      </SectionCard>
      <SectionCard
        title="Preferences"
        description="Currency, location and how budgets count credit card spending."
      >
        <SectionFields>
          <InfoItem label="Default currency" value={household.defaultCurrencyId} />
          <InfoItem label="Country" value={countryName} />
          <InfoItem label="Time zone" value={formatTimezoneLabel(household.timezone)} />
          <InfoItem label="Budget month starts on" value={`Day ${household.budgetMonthStartsOn}`} />
          <InfoItem label="Credit card expenses count in" value={timingLabel} />
          <InfoItem label="Installments count as" value={installmentLabel} />
        </SectionFields>
      </SectionCard>
      <SectionCard title="About" description="When this household was created and by whom.">
        <SectionFields>
          <InfoItem label="Created" value={formatDate(household.createdAt)} />
          <InfoItem
            label="Created by"
            value={<MemberDisplay userId={household.createdByUserId} size="xs" />}
          />
          <InfoItem label="Last updated" value={formatDate(household.updatedAt)} />
        </SectionFields>
      </SectionCard>
      <HouseholdSettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        household={household}
        onSubmit={(body: CreateHouseholdInput) =>
          update.mutate(
            { householdId: household.id, body },
            {
              onSuccess: () => {
                setSettingsOpen(false);
                toast.success("Household updated");
              },
            },
          )
        }
        isPending={update.isPending}
      />
      <HouseholdDeleteDialog
        householdName={household.name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={() => remove.mutate(household.id)}
        isPending={remove.isPending}
      />
    </>
  );
}
