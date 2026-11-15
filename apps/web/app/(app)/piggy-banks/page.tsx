"use client";

import type { PiggyBank, PiggyBankParentAccount } from "@luraba/contracts";
import { useRouter } from "next/navigation";
import * as React from "react";

import {
  AccountDisplay,
  type AccountDisplayInput,
  AmountDisplay,
  CombinedAmountDisplay,
} from "@/components/display";
import { HeaderAddButton } from "@/components/finance/header-actions";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { PERMISSIONS, useCan } from "@/components/permissions";
import { type PiggyBankAction, PiggyBankCard } from "@/components/piggy-banks/piggy-bank-card";
import {
  PiggyBankFundsModal,
  type PiggyFundsMode,
} from "@/components/piggy-banks/piggy-bank-funds-modal";
import {
  PIGGY_ACCOUNT_ROW_HEIGHT,
  PIGGY_BANKS_GRID,
} from "@/components/piggy-banks/piggy-bank-layout";
import { PiggyBankSheet } from "@/components/piggy-banks/piggy-bank-sheet";
import { DataBoundary } from "@/components/states";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCombinedAmount } from "@/hooks/use-combined-amount";
import { cn } from "@/lib/utils";
import {
  useArchivePiggyBankMutation,
  useUnarchivePiggyBankMutation,
} from "@/mutations/piggy-banks/use-piggy-bank-mutations";
import { useAccountsQuery } from "@/queries/accounts/use-accounts-query";
import { usePiggyBanksQuery } from "@/queries/piggy-banks/use-piggy-banks-queries";
import { useAuthSessionStore } from "@/stores/auth-session-store";
import { PiggyBanksEmpty } from "./_empty";
import { PiggyBanksError } from "./_error";
import { PiggyBanksLoading } from "./_loading";

function AccountRow({
  account,
  display,
  language,
}: {
  account: PiggyBankParentAccount;
  display: AccountDisplayInput | undefined;
  language: string;
}) {
  const money = { currencyCode: account.currencyCode, language };
  return (
    <li
      className={cn(
        "flex items-center justify-between gap-3 border-b border-border/60 last:border-b-0",
        PIGGY_ACCOUNT_ROW_HEIGHT,
      )}
    >
      <AccountDisplay account={display} size="md" />
      <div className="flex items-baseline gap-4 text-sm">
        <span className="text-muted-foreground">
          In piggy banks <AmountDisplay amount={account.piggyTotal} {...money} />
        </span>
        <span className="text-muted-foreground">
          Free{" "}
          <AmountDisplay
            amount={account.free}
            {...money}
            kind={account.free < 0 ? "expense" : "neutral"}
          />
        </span>
      </div>
    </li>
  );
}

export default function PiggyBanksPage() {
  const router = useRouter();
  const can = useCan();
  const canUpdate = can(PERMISSIONS.PIGGY_BANKS_UPDATE);
  const canDelete = can(PERMISSIONS.PIGGY_BANKS_DELETE);
  const language = useAuthSessionStore((state) => state.user?.preferences.language ?? "en");
  const [showArchived, setShowArchived] = React.useState(false);
  const query = usePiggyBanksQuery({ includeArchived: showArchived });
  const piggyBanks = React.useMemo(() => query.data?.piggyBanks ?? [], [query.data]);
  const accounts = query.data?.accounts ?? [];
  const accountList = useAccountsQuery({ perPage: 200 });
  const accountById = new Map(
    (accountList.data?.data ?? []).map((account) => [account.id, account]),
  );

  const balanceByCurrency = React.useMemo(() => {
    const totals: Record<string, number> = {};
    for (const piggy of piggyBanks) {
      if (piggy.archivedAt) continue;
      totals[piggy.currencyCode] = (totals[piggy.currencyCode] ?? 0) + piggy.balance;
    }
    return totals;
  }, [piggyBanks]);
  const earnedByCurrency = React.useMemo(() => {
    const totals: Record<string, number> = {};
    for (const piggy of piggyBanks) {
      totals[piggy.currencyCode] = (totals[piggy.currencyCode] ?? 0) + piggy.monthEarnings;
    }
    return totals;
  }, [piggyBanks]);
  const balance = useCombinedAmount(balanceByCurrency);
  const earned = useCombinedAmount(earnedByCurrency);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<PiggyBank | null>(null);
  const [funds, setFunds] = React.useState<{ piggy: PiggyBank; mode: PiggyFundsMode } | null>(null);
  const [archiving, setArchiving] = React.useState<PiggyBank | null>(null);
  const archive = useArchivePiggyBankMutation({
    onSuccess: () => setArchiving(null),
    successToast: { title: "Piggy bank archived" },
  });
  const restore = useUnarchivePiggyBankMutation({ successToast: { title: "Piggy bank restored" } });

  const onAction = (action: PiggyBankAction, piggy: PiggyBank) => {
    if (action === "open") router.push(`/piggy-banks/${piggy.id}`);
    else if (action === "edit") setEditing(piggy);
    else if (action === "archive") setArchiving(piggy);
    else if (action === "restore") restore.mutate(piggy.id);
    else setFunds({ piggy, mode: action });
  };

  const loading = query.isPending || balance.isPending || earned.isPending;

  return (
    <InternalPageLayout
      title="Piggy banks"
      subtitle="Name the parts of your accounts and let them earn."
      kpisLoading={loading}
      kpiLabels={["In piggy banks", "Earned this month"]}
      kpis={
        loading || piggyBanks.length === 0
          ? undefined
          : [
              {
                label: "In piggy banks",
                value: (
                  <CombinedAmountDisplay
                    combined={balance.combined}
                    fx={balance.fx}
                    language={language}
                    size="sm"
                  />
                ),
              },
              {
                label: "Earned this month",
                value: (
                  <CombinedAmountDisplay
                    combined={earned.combined}
                    fx={earned.fx}
                    language={language}
                    size="sm"
                    kind="income"
                  />
                ),
              },
            ]
      }
      actions={
        <HeaderAddButton
          label="New piggy bank"
          permission={PERMISSIONS.PIGGY_BANKS_CREATE}
          deniedMessage="Your household role cannot create piggy banks."
          onClick={() => setCreateOpen(true)}
        />
      }
    >
      <div className="flex items-center justify-end gap-2">
        <Label htmlFor="show-archived" className="text-sm text-muted-foreground">
          Show archived
        </Label>
        <Switch id="show-archived" checked={showArchived} onCheckedChange={setShowArchived} />
      </div>
      <DataBoundary
        isPending={query.isPending}
        isError={query.isError}
        isEmpty={piggyBanks.length === 0}
        loading={<PiggyBanksLoading />}
        errorState={
          <PiggyBanksError message={query.error?.message} onRetry={() => void query.refetch()} />
        }
        empty={<PiggyBanksEmpty onCreate={() => setCreateOpen(true)} />}
      >
        <div className="space-y-5">
          <ul>
            {accounts
              .filter((account) => account.piggyBankCount > 0)
              .map((account) => (
                <AccountRow
                  key={account.accountId}
                  account={account}
                  display={accountById.get(account.accountId)}
                  language={language}
                />
              ))}
          </ul>
          <ul className={PIGGY_BANKS_GRID}>
            {piggyBanks.map((piggy) => (
              <PiggyBankCard
                key={piggy.id}
                piggyBank={piggy}
                language={language}
                canUpdate={canUpdate}
                canDelete={canDelete}
                onOpen={(item) => router.push(`/piggy-banks/${item.id}`)}
                onAction={onAction}
              />
            ))}
          </ul>
        </div>
      </DataBoundary>

      <PiggyBankSheet open={createOpen} onOpenChange={setCreateOpen} />
      <PiggyBankFundsModal
        open={funds !== null}
        onOpenChange={(open) => !open && setFunds(null)}
        piggyBank={funds?.piggy ?? null}
        siblings={piggyBanks}
        initialMode={funds?.mode ?? "deposit"}
      />
      <ConfirmDialog
        open={archiving !== null}
        onOpenChange={(open) => !open && setArchiving(null)}
        variant="destructive"
        title={`Archive ${archiving?.title ?? "this piggy bank"}?`}
        description={
          archiving && archiving.balance !== 0
            ? "It still holds money. Move or withdraw it first: only an empty piggy bank can be archived."
            : "It disappears from the list. You can restore it later."
        }
        confirmLabel="Archive"
        isLoading={archive.isPending}
        errorMessage={archive.errorMessage}
        onConfirm={() => archiving && archive.mutate(archiving.id)}
      />
    </InternalPageLayout>
  );
}
