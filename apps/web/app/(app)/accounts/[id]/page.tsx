"use client";

import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { TransactionFeedRow } from "@luraba/contracts";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { AccountProfileDetails } from "@/components/accounts/account-profile-details";
import { AccountSheet } from "@/components/accounts/account-sheet";
import { AdjustAccountBalanceSheet } from "@/components/accounts/adjust-account-balance-sheet";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { MoneyValue } from "@/components/finance/money-value";
import { PERMISSIONS, PermissionButton, ResourceAccessBoundary } from "@/components/permissions";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { formatAccountSubtypeLabel, formatAccountTypeLabel } from "@/lib/accounts";
import { formatShortDate } from "@/lib/format";
import { queryClient } from "@/lib/query-client";
import { useDeleteAccountMutation } from "@/mutations/accounts/use-account-mutations";
import {
  accountQueryKeys,
  useAccountQuery,
  useAccountTransactionsQuery,
} from "@/queries/accounts/use-accounts-query";
import { useAuthSessionStore } from "@/stores/auth-session-store";

import { AccountDetailsError } from "./_error";
import { AccountDetailsLoading } from "./_loading";

function RecentActivityRow({ row, language }: { row: TransactionFeedRow; language: string }) {
  return (
    <div className="flex items-center justify-between gap-5 border-b border-border/60 py-3 last:border-b-0">
      <div className="min-w-0">
        <Typography variant="small-strong" className="truncate">
          {row.description}
        </Typography>
        <Typography variant="small-muted" className="mt-1">
          {formatShortDate(row.postedDate, language)}
        </Typography>
      </div>
      <MoneyValue
        amount={row.amount}
        currencyCode={row.currencyCode}
        language={language}
        signed
        className="shrink-0 text-sm"
      />
    </div>
  );
}

export default function AccountDetailsPage() {
  const { id = "" } = useParams<{ id: string }>();
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [adjustOpen, setAdjustOpen] = React.useState(false);
  const accountQuery = useAccountQuery(id);
  const account = accountQuery.data;
  const language = useAuthSessionStore((state) => state.user?.preferences.language ?? "en");
  const accountActivity = useAccountTransactionsQuery(
    id,
    { page: 1, perPage: 8, sort: "postedDate", sortDirection: "desc" },
    { enabled: Boolean(account) },
  );
  const deleteAccountMutation = useDeleteAccountMutation({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: accountQueryKeys.all });
      router.replace("/accounts");
    },
  });

  if (accountQuery.isPending) {
    return <AccountDetailsLoading />;
  }

  return (
    <ResourceAccessBoundary
      error={accountQuery.error}
      resourceName="account"
      backHref="/accounts"
      fallback={
        <AccountDetailsError
          message={accountQuery.error?.message || "We couldn't load this account right now."}
          onRetry={() => void accountQuery.refetch()}
        />
      }
    >
      {account ? (
        <InternalPageLayout
          title={account.name}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => router.push("/accounts")}>
                <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
                Accounts
              </Button>
              <PermissionButton
                permission={PERMISSIONS.TRANSACTIONS_CREATE}
                variant="outline"
                size="sm"
                onClick={() => setAdjustOpen(true)}
              >
                Adjust balance
              </PermissionButton>
              <PermissionButton
                permission={PERMISSIONS.ACCOUNTS_UPDATE}
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(true)}
              >
                Edit
              </PermissionButton>
            </div>
          }
        >
          <AccountSheet
            account={account}
            open={editOpen}
            onOpenChange={setEditOpen}
            defaultCurrencyCode={account.currencyCode}
          />
          <AdjustAccountBalanceSheet
            account={account}
            open={adjustOpen}
            onOpenChange={setAdjustOpen}
          />

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="space-y-6">
              <section className="rounded-[1.5rem] border border-border/70 bg-[var(--color-container)] p-6 shadow-none">
                <Typography variant="eyebrow">
                  {formatAccountTypeLabel(account.type)} ·{" "}
                  {formatAccountSubtypeLabel(account.details.subtype)}
                </Typography>
                <Typography variant="small-muted" className="mt-3">
                  {account.classification === "liability"
                    ? account.balance < 0
                      ? "Overpayment"
                      : "Amount owed"
                    : "Current balance"}
                </Typography>
                <MoneyValue
                  amount={account.balance}
                  currencyCode={account.currencyCode}
                  language={language}
                  className={`mt-1 block text-3xl ${
                    account.classification === "liability" && account.balance > 0
                      ? "text-destructive"
                      : account.classification === "liability" && account.balance < 0
                        ? "text-emerald-300"
                        : "text-foreground"
                  }`}
                />
                {account.institutionName ? (
                  <Typography variant="body-muted" className="mt-3">
                    {account.institutionName}
                  </Typography>
                ) : null}
              </section>

              <section className="rounded-[1.5rem] border border-border/70 bg-[var(--color-container)] p-6 shadow-none">
                <Typography as="h2" variant="section-title">
                  Recent activity
                </Typography>
                <div className="mt-4">
                  {accountActivity.data?.data.map((row) => (
                    <RecentActivityRow key={row.rowId} row={row} language={language} />
                  ))}
                  {accountActivity.data?.data.length === 0 ? (
                    <Typography variant="body-muted" className="py-6">
                      No activity for this account yet.
                    </Typography>
                  ) : null}
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="rounded-[1.5rem] border border-border/70 bg-[var(--color-container)] p-6 shadow-none">
                <Typography as="h2" variant="section-title">
                  Details
                </Typography>
                <div className="mt-3">
                  <AccountProfileDetails account={account} language={language} />
                </div>
              </section>
              {account.notes ? (
                <section className="rounded-[1.5rem] border border-border/70 bg-[var(--color-container)] p-6 shadow-none">
                  <Typography as="h2" variant="section-title">
                    Notes
                  </Typography>
                  <Typography variant="body-muted" className="mt-3 whitespace-pre-wrap">
                    {account.notes}
                  </Typography>
                </section>
              ) : null}
              <section className="rounded-[1.5rem] border border-destructive/30 bg-destructive/5 p-6 shadow-none">
                <Typography as="h2" variant="section-title">
                  Delete account
                </Typography>
                <Typography variant="small-muted" className="mt-2">
                  This permanently removes the account and its activity.
                </Typography>
                <PermissionButton
                  permission={PERMISSIONS.ACCOUNTS_DELETE}
                  variant="destructive"
                  size="sm"
                  className="mt-4 shadow-none"
                  isLoading={deleteAccountMutation.isPending}
                  onClick={() => {
                    if (!window.confirm(`Delete ${account.name}? This cannot be undone.`)) return;
                    deleteAccountMutation.mutate(account.id);
                  }}
                >
                  Delete permanently
                </PermissionButton>
              </section>
            </div>
          </div>
        </InternalPageLayout>
      ) : null}
    </ResourceAccessBoundary>
  );
}
