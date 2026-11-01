"use client";

import { ArrowRight01Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { AccountSummary } from "@luraba/contracts";
import Link from "next/link";
import * as React from "react";
import { AccountSheet } from "@/components/accounts/account-sheet";
import { AccountDisplay, AmountDisplay } from "@/components/display";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { ItemReveal, SectionReveal } from "@/components/motion/reveal";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";
import { Typography } from "@/components/ui/typography";
import { ACCOUNT_ROW_CLASS, accountBalanceKind } from "@/lib/accounts";
import { useAccountQuery, useAccountsQuery } from "@/queries/accounts/use-accounts-query";
import { useAuthSessionStore, useDefaultCurrencyCode } from "@/stores/auth-session-store";

import { AccountsEmpty } from "./_empty";
import { AccountsError } from "./_error";
import { AccountsLoading } from "./_loading";

function AccountRow({
  account,
  language,
  index,
  onEdit,
}: {
  account: AccountSummary;
  language: string;
  index: number;
  onEdit: (account: AccountSummary) => void;
}) {
  return (
    <ItemReveal delay={0.04 * index}>
      <div className={ACCOUNT_ROW_CLASS}>
        <Link
          href={`/accounts/${account.id}`}
          aria-label={`Open ${account.name}`}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <AccountDisplay account={account} size="lg" detail="full" className="flex-1" />
          <div className="shrink-0 text-right">
            <Typography
              variant="small-muted"
              className="text-[0.68rem] tracking-[0.12em] uppercase"
            >
              Balance
            </Typography>
            <AmountDisplay
              amount={account.balance}
              currencyCode={account.currencyCode}
              language={language}
              kind={accountBalanceKind(account.classification, account.balance)}
              showSign={false}
            />
          </div>
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            strokeWidth={2}
            className="size-4 shrink-0 text-muted-foreground"
          />
        </Link>
        <PermissionButton
          permission={PERMISSIONS.ACCOUNTS_UPDATE}
          deniedMessage="Your household role cannot edit accounts."
          variant="ghost"
          size="icon"
          aria-label={`Edit ${account.name}`}
          onClick={() => onEdit(account)}
        >
          <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
        </PermissionButton>
      </div>
    </ItemReveal>
  );
}

function AccountGroup({
  title,
  accounts,
  language,
  onEdit,
}: {
  title: string;
  accounts: AccountSummary[];
  language: string;
  onEdit: (account: AccountSummary) => void;
}) {
  if (accounts.length === 0) {
    return null;
  }

  return (
    <SectionReveal className="space-y-4">
      <Typography as="h2" variant="eyebrow">
        {title}
      </Typography>

      <div className="space-y-3">
        {accounts.map((account, index) => (
          <AccountRow
            key={account.id}
            account={account}
            language={language}
            index={index}
            onEdit={onEdit}
          />
        ))}
      </div>
    </SectionReveal>
  );
}

export default function AccountsPage() {
  const [isCreateSheetOpen, setIsCreateSheetOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const query = useAccountsQuery();
  const editingQuery = useAccountQuery(editingId ?? "", { enabled: editingId !== null });
  const language = useAuthSessionStore((state) => state.user?.preferences.language ?? "en");
  const defaultCurrencyCode = useDefaultCurrencyCode();

  const accounts = query.data?.data ?? [];
  const assets = accounts.filter((account) => account.classification === "asset");
  const liabilities = accounts.filter((account) => account.classification === "liability");

  const edit = (account: AccountSummary) => setEditingId(account.id);

  const pageContent = query.isPending ? (
    <AccountsLoading />
  ) : query.isError ? (
    <AccountsError
      message={query.error.message || "An unexpected error occurred while loading this page."}
      onRetry={() => void query.refetch()}
    />
  ) : accounts.length === 0 ? (
    <AccountsEmpty onCreate={() => setIsCreateSheetOpen(true)} />
  ) : (
    <>
      <AccountGroup title="Assets" accounts={assets} language={language} onEdit={edit} />
      <AccountGroup title="Liabilities" accounts={liabilities} language={language} onEdit={edit} />
    </>
  );

  return (
    <InternalPageLayout
      title="Accounts"
      subtitle="Everything you hold and owe, with balances in one place."
      actions={
        <PermissionButton
          permission={PERMISSIONS.ACCOUNTS_CREATE}
          deniedMessage="Your household role cannot create accounts."
          onClick={() => setIsCreateSheetOpen(true)}
        >
          Add account
        </PermissionButton>
      }
    >
      <AccountSheet
        open={isCreateSheetOpen}
        onOpenChange={setIsCreateSheetOpen}
        defaultCurrencyCode={defaultCurrencyCode}
      />
      <AccountSheet
        account={editingQuery.data}
        open={editingId !== null && Boolean(editingQuery.data)}
        onOpenChange={(open) => {
          if (!open) setEditingId(null);
        }}
        defaultCurrencyCode={editingQuery.data?.currencyCode ?? defaultCurrencyCode}
      />
      {pageContent}
    </InternalPageLayout>
  );
}
