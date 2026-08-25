"use client"

import { ArrowRight01Icon, WalletIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"
import * as React from "react"

import { AccountSheet } from "@/components/accounts/account-sheet"
import { EmptyState } from "@/components/empty-state"
import { InternalPageLayout } from "@/components/finance/internal-page-layout"
import { MoneyValue } from "@/components/finance/money-value"
import { ItemReveal, SectionReveal } from "@/components/motion/reveal"
import { PERMISSIONS, PermissionButton } from "@/components/permissions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Typography } from "@/components/ui/typography"
import type { AccountSummary } from "@/interfaces/account"
import {
  formatAccountSubtypeLabel,
  formatAccountTypeLabel,
  getAccountTypeIcon,
} from "@/lib/accounts"
import { useAccountsQuery } from "@/queries/accounts/use-accounts-query"
import { useAuthSessionStore } from "@/stores/auth-session-store"

import { AccountsError } from "./_error"
import { AccountsLoading } from "./_loading"

function getAccountInitials(account: AccountSummary) {
  const source = account.institutionName || account.name
  const [first = "", second = ""] = source.split(/\s+/)
  return `${first[0] ?? ""}${second[0] ?? ""}`.toUpperCase() || "AC"
}

function AccountRow({
  account,
  language,
  index,
}: {
  account: AccountSummary
  language: string
  index: number
}) {
  const typeLabel = formatAccountTypeLabel(account.type)
  const details = [
    account.institutionName,
    `${typeLabel} · ${formatAccountSubtypeLabel(account.subtype)}`,
  ].filter(Boolean)
  const TypeIcon = getAccountTypeIcon(account.type)
  const balanceTone =
    account.classification === "liability"
      ? account.balance > 0
        ? "text-rose-300"
        : account.balance < 0
          ? "text-emerald-300"
          : "text-foreground"
      : account.balance >= 0
        ? "text-emerald-300"
        : "text-rose-300"

  return (
    <ItemReveal delay={0.04 * index}>
      <Link
        href={`/accounts/${account.id}`}
        className="block rounded-[1.35rem] bg-[var(--color-container-inset)] px-3.5 py-3.5 transition-[background-color,transform] hover:translate-y-[-1px] hover:bg-[color:oklch(0.29_0_0)] md:px-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar className="size-10 border-transparent bg-background/40">
              {account.institutionLogoUrl ? (
                <AvatarImage
                  src={account.institutionLogoUrl}
                  alt={account.name}
                />
              ) : null}
              <AvatarFallback>{getAccountInitials(account)}</AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <Typography variant="small-strong" className="truncate text-sm">
                {account.name}
              </Typography>

              {details.length > 0 ? (
                <div className="mt-1 flex min-w-0 items-center gap-1.5 text-muted-foreground">
                  <HugeiconsIcon
                    icon={TypeIcon}
                    strokeWidth={2}
                    className="size-3.5 shrink-0"
                  />
                  <Typography
                    variant="small-muted"
                    className="truncate text-[0.72rem]"
                  >
                    {details.join(" • ")}
                  </Typography>
                </div>
              ) : null}

              {account.notes ? (
                <Typography
                  variant="small-muted"
                  className="mt-1 truncate text-[0.72rem]"
                >
                  {account.notes}
                </Typography>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="text-right">
              <Typography
                variant="small-muted"
                className="text-[0.68rem] tracking-[0.12em] uppercase"
              >
                Balance
              </Typography>
              <MoneyValue
                amount={account.balance}
                currencyCode={account.currencyCode}
                language={language}
                className={`text-sm ${balanceTone}`}
              />
            </div>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              strokeWidth={2}
              className="size-4 shrink-0 text-muted-foreground"
            />
          </div>
        </div>
      </Link>
    </ItemReveal>
  )
}

function AccountGroup({
  title,
  accounts,
  language,
}: {
  title: string
  accounts: AccountSummary[]
  language: string
}) {
  if (accounts.length === 0) {
    return null
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
          />
        ))}
      </div>
    </SectionReveal>
  )
}

function EmptyAccountsState({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={
        <HugeiconsIcon icon={WalletIcon} strokeWidth={1.8} className="size-5" />
      }
      title="Bring your accounts together"
      description="Add cash, investments, property, vehicles, or loans to see your full financial picture in one place."
      action={
        <PermissionButton
          permission={PERMISSIONS.ACCOUNTS_CREATE}
          deniedMessage="Your household role cannot create accounts."
          onClick={onCreate}
        >
          Add your first account
        </PermissionButton>
      }
    />
  )
}

export default function AccountsPage() {
  const [isCreateSheetOpen, setIsCreateSheetOpen] = React.useState(false)
  const query = useAccountsQuery()
  const language = useAuthSessionStore(
    (state) => state.user?.preferences.language ?? "en",
  )
  const defaultCurrencyCode = useAuthSessionStore(
    (state) => state.household?.settings.defaultCurrencyId ?? "BRL",
  )

  const accounts = query.data?.data ?? []
  const assets = accounts.filter(
    (account) => account.classification === "asset",
  )
  const liabilities = accounts.filter(
    (account) => account.classification === "liability",
  )

  const pageContent = query.isPending ? (
    <AccountsLoading />
  ) : query.isError ? (
    <AccountsError
      message={
        query.error.message ||
        "An unexpected error occurred while loading this page."
      }
      onRetry={() => void query.refetch()}
    />
  ) : accounts.length === 0 ? (
    <EmptyAccountsState onCreate={() => setIsCreateSheetOpen(true)} />
  ) : (
    <>
      <AccountGroup title="Assets" accounts={assets} language={language} />
      <AccountGroup
        title="Liabilities"
        accounts={liabilities}
        language={language}
      />
    </>
  )

  return (
    <InternalPageLayout
      title="Accounts"
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
      {pageContent}
    </InternalPageLayout>
  )
}
