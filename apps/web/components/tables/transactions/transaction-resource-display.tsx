"use client";

import type { AccountDetails, CreditCard, Merchant, TransactionFeedRow } from "@luraba/contracts";
import { formatDisplayDate } from "@luraba/domain";
import * as React from "react";
import { type AccountDisplayInput, AccountMark, MerchantMark } from "@/components/display";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { formatAccountTypeLabel } from "@/lib/accounts";
import { useAccountQuery } from "@/queries/accounts/use-accounts-query";
import { useCreditCardQuery } from "@/queries/credit-cards/use-credit-cards-query";
import { useMerchantQuery } from "@/queries/merchants/use-merchants-query";
import type { TransactionLookups } from "@/queries/transactions/use-transaction-lookups-query";

function AccountHoverDetails({
  account,
  card,
  accountLoading,
  cardLoading,
  accountError,
  cardError,
}: {
  account: AccountDetails | undefined;
  card: CreditCard | undefined;
  accountLoading: boolean;
  cardLoading: boolean;
  accountError: Error | null;
  cardError: Error | null;
}) {
  if (accountLoading || cardLoading) {
    return (
      <div
        className="space-y-2"
        aria-busy="true"
        aria-label="Loading account details"
        role="status"
      >
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-28" />
      </div>
    );
  }

  if (accountError || cardError || (!account && !card)) {
    return <p className="text-xs text-muted-foreground">Account details unavailable.</p>;
  }

  const resource = card ?? account;
  const name = card ? `${card.brand} •••• ${card.last4}` : (account?.name ?? "Account");
  const type = card ? "Credit card" : account ? formatAccountTypeLabel(account.type) : null;
  const currency = resource?.currencyCode;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {resource ? <AccountMark account={resource} size="md" /> : null}
        <div className="min-w-0">
          <Typography as="p" variant="small-strong" className="truncate">
            {name}
          </Typography>
          <Typography as="p" variant="small-muted" className="truncate">
            {type}
          </Typography>
        </div>
      </div>
      <dl className="grid gap-2 border-t border-border pt-3 text-xs">
        {resource?.institutionName ? (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Institution</dt>
            <dd className="truncate text-right">{resource.institutionName}</dd>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Currency</dt>
          <dd>{currency}</dd>
        </div>
        {card ? (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Credit limit</dt>
            <dd>{card.creditLimitAmount}</dd>
          </div>
        ) : account ? (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Balance</dt>
            <dd>{account.balance}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

export function TransactionAccountDisplay({
  row,
  lookups,
}: {
  row: TransactionFeedRow;
  lookups: TransactionLookups;
}) {
  const [open, setOpen] = React.useState(false);
  const card = row.creditCardId
    ? lookups.creditCards.find((item) => item.id === row.creditCardId)
    : undefined;
  const account = row.accountId
    ? lookups.accounts.find((item) => item.id === row.accountId)
    : undefined;
  const accountId = row.accountId ?? "";
  const creditCardId = row.creditCardId ?? "";
  const accountQuery = useAccountQuery(accountId, {
    enabled: open && Boolean(accountId),
  });
  const cardQuery = useCreditCardQuery(creditCardId, {
    enabled: open && Boolean(creditCardId),
  });
  const label = card
    ? `${card.brand} •••• ${card.last4}`
    : (account?.name ?? row.accountName ?? "No account");
  const visual = card ?? account;

  return (
    <div className="min-w-44">
      <HoverCard openDelay={300} closeDelay={120} open={open} onOpenChange={setOpen}>
        <HoverCardTrigger asChild>
          <button
            type="button"
            className="flex min-w-0 items-center gap-2 text-left"
            aria-label={`View details for ${label}`}
          >
            {visual ? <AccountMark account={visual} /> : null}
            <span className="truncate text-xs font-medium">{label}</span>
          </button>
        </HoverCardTrigger>
        <HoverCardContent align="start" className="w-72">
          <AccountHoverDetails
            account={accountQuery.data}
            card={cardQuery.data}
            accountLoading={Boolean(accountId) && accountQuery.isPending}
            cardLoading={Boolean(creditCardId) && cardQuery.isPending}
            accountError={accountId ? accountQuery.error : null}
            cardError={creditCardId ? cardQuery.error : null}
          />
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}

function MerchantHoverDetails({
  merchant,
  isLoading,
  isError,
}: {
  merchant: Merchant | undefined;
  isLoading: boolean;
  isError: boolean;
}) {
  if (isLoading) {
    return (
      <div
        className="space-y-2"
        aria-busy="true"
        aria-label="Loading merchant details"
        role="status"
      >
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-28" />
      </div>
    );
  }
  if (isError || !merchant) {
    return <p className="text-xs text-muted-foreground">Merchant details unavailable.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MerchantMark merchant={merchant} size="md" />
        <div className="min-w-0">
          <Typography as="p" variant="small-strong" className="truncate">
            {merchant.name}
          </Typography>
          <Typography as="p" variant="small-muted" className="truncate">
            {merchant.domain ?? "No domain"}
          </Typography>
        </div>
      </div>
      <dl className="grid gap-2 border-t border-border pt-3 text-xs">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Created</dt>
          <dd>{formatDisplayDate(merchant.createdAt, { formatString: "P" })}</dd>
        </div>
      </dl>
    </div>
  );
}

export function TransactionAccountPanelDisplay({
  accountId,
  accountName,
  row,
  lookups,
}: {
  accountId?: string | null;
  accountName?: string | null;
  row: TransactionFeedRow;
  lookups: TransactionLookups;
}) {
  const resolvedAccountId = accountId === undefined ? row.accountId : accountId;
  const resolvedAccountName = accountName === undefined ? row.accountName : accountName;
  const resolvedCreditCardId = accountId === undefined ? row.creditCardId : null;
  const card = resolvedCreditCardId
    ? lookups.creditCards.find((item) => item.id === resolvedCreditCardId)
    : undefined;
  const account = resolvedAccountId
    ? lookups.accounts.find((item) => item.id === resolvedAccountId)
    : undefined;
  const accountQuery = useAccountQuery(resolvedAccountId ?? "", {
    enabled: Boolean(resolvedAccountId),
  });
  const cardQuery = useCreditCardQuery(resolvedCreditCardId ?? "", {
    enabled: Boolean(resolvedCreditCardId),
  });
  const resolvedCard = cardQuery.data ?? card;
  const resolvedAccount = accountQuery.data ?? account;
  const label = resolvedCard
    ? `${resolvedCard.brand} •••• ${resolvedCard.last4}`
    : (resolvedAccount?.name ?? resolvedAccountName ?? "No account");
  const type = resolvedCard
    ? "Credit card"
    : resolvedAccount
      ? formatAccountTypeLabel(resolvedAccount.type)
      : "Account";

  return (
    <div className="flex min-w-0 items-center gap-2">
      {(resolvedCard ?? resolvedAccount) ? (
        <AccountMark account={(resolvedCard ?? resolvedAccount) as AccountDisplayInput} size="md" />
      ) : null}
      <div className="min-w-0">
        <Typography as="p" variant="small-strong" className="truncate">
          {label}
        </Typography>
        <Typography as="p" variant="small-muted" className="truncate">
          {type}
        </Typography>
      </div>
    </div>
  );
}

export function TransactionMerchantPanelDisplay({
  merchantId,
  lookups,
}: {
  merchantId: string | null;
  lookups: TransactionLookups;
}) {
  const merchant = merchantId
    ? lookups.merchants.find((item) => item.id === merchantId)
    : undefined;
  const merchantQuery = useMerchantQuery(merchantId ?? "", {
    enabled: Boolean(merchantId),
  });

  if (!merchantId || !merchant) {
    return <span className="text-xs text-muted-foreground">No merchant</span>;
  }

  const resolvedMerchant = merchantQuery.data ?? merchant;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <MerchantMark merchant={resolvedMerchant} size="md" />
      <div className="min-w-0">
        <Typography as="p" variant="small-strong" className="truncate">
          {resolvedMerchant.name}
        </Typography>
      </div>
    </div>
  );
}

export function TransactionMerchantDisplay({
  merchantId,
  lookups,
}: {
  merchantId: string | null;
  lookups: TransactionLookups;
}) {
  const [open, setOpen] = React.useState(false);
  const lookupMerchant = merchantId
    ? lookups.merchants.find((item) => item.id === merchantId)
    : undefined;
  const merchantQuery = useMerchantQuery(merchantId ?? "", {
    enabled: open && Boolean(merchantId),
  });

  if (!merchantId || !lookupMerchant) {
    return <span className="text-xs text-muted-foreground">-</span>;
  }

  return (
    <div className="min-w-36">
      <HoverCard openDelay={300} closeDelay={120} open={open} onOpenChange={setOpen}>
        <HoverCardTrigger asChild>
          <button
            type="button"
            className="flex min-w-0 items-center gap-2 text-left"
            aria-label={`View details for ${lookupMerchant.name}`}
          >
            <MerchantMark merchant={lookupMerchant} />
            <span className="truncate text-xs font-medium">{lookupMerchant.name}</span>
          </button>
        </HoverCardTrigger>
        <HoverCardContent align="start" className="w-72">
          <MerchantHoverDetails
            merchant={merchantQuery.data}
            isLoading={merchantQuery.isPending}
            isError={merchantQuery.isError}
          />
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}
