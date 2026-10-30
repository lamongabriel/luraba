"use client";

import type {
  Account,
  AccountDetails,
  AccountSummary,
  CreditCard,
  InvestmentAccount,
} from "@luraba/contracts";

import { CreditCardBrandMark } from "@/components/credit-cards/credit-card-brand";
import { uploadContentUrl } from "@/lib/uploads";
import { cn } from "@/lib/utils";

import {
  ACCOUNT_SUBTYPE_ICONS,
  ACCOUNT_TYPE_DISPLAY,
  DISPLAY_SIZES,
  type DisplayIcon,
  type DisplaySize,
  EMPTY_LABELS,
} from "./constants";
import { DisplayMark } from "./display-mark";

/** Anything the app calls an account: a plain account, a summary/details, or a credit card. */
export type AccountDisplayInput =
  | Account
  | AccountSummary
  | AccountDetails
  | CreditCard
  | InvestmentAccount;

/** An investment account has no `type` field; it is always the investment type. */
function typeOf(account: Exclude<AccountDisplayInput, CreditCard>) {
  return "type" in account ? account.type : ("investment" as const);
}

function isCard(account: AccountDisplayInput): account is CreditCard {
  return "brand" in account && "last4" in account;
}

/** The one place that decides which picture or icon stands for an account. */
export function getAccountVisual(account: AccountDisplayInput): {
  imageUrl: string | null;
  icon: DisplayIcon;
  color: string;
  cardBrand: string | null;
} {
  const type = isCard(account) ? "credit_card" : typeOf(account);
  const config = ACCOUNT_TYPE_DISPLAY[type];
  const subtype = "subtype" in account ? account.subtype : undefined;
  const upload = "imageUploadId" in account ? account.imageUploadId : null;

  return {
    // Priority: a picture the user uploaded, then the institution logo. Cards show their brand.
    imageUrl: upload
      ? uploadContentUrl(upload)
      : isCard(account)
        ? null
        : (account.institutionLogoUrl ?? null),
    icon: (subtype && ACCOUNT_SUBTYPE_ICONS[subtype]) || config.icon,
    color: config.color,
    cardBrand: isCard(account) ? account.brand : null,
  };
}

export function getAccountLabels(account: AccountDisplayInput): { name: string; detail: string } {
  if (isCard(account)) {
    return { name: account.name, detail: `${account.brand} •••• ${account.last4}` };
  }
  if (!("type" in account)) {
    return { name: account.name, detail: account.broker ?? ACCOUNT_TYPE_DISPLAY.investment.label };
  }
  return { name: account.name, detail: ACCOUNT_TYPE_DISPLAY[account.type].label };
}

/** Just the tile (picture, card brand or type icon). */
export function AccountMark({
  account,
  size = "sm",
  className,
}: {
  account: AccountDisplayInput;
  size?: DisplaySize;
  className?: string;
}) {
  const visual = getAccountVisual(account);
  const brandMark = visual.cardBrand ? (
    <CreditCardBrandMark brand={visual.cardBrand} className="size-full p-0.5" />
  ) : undefined;

  return (
    <DisplayMark
      imageUrl={visual.imageUrl}
      icon={visual.icon}
      color={visual.color}
      fallback={brandMark}
      size={size}
      className={cn(brandMark && "bg-background", className)}
    />
  );
}

/**
 * How an account is shown everywhere: tile + name, with an optional second line. Pass any account
 * object; the type, uploaded picture, institution logo or card brand are chosen for you.
 */
export function AccountDisplay({
  account,
  size = "sm",
  detail = "none",
  className,
  emptyLabel = EMPTY_LABELS.account,
}: {
  account: AccountDisplayInput | null | undefined;
  size?: DisplaySize;
  /** "type" shows the account type (or `Brand •••• 1234` for cards) under the name. */
  detail?: "none" | "type";
  className?: string;
  emptyLabel?: string;
}) {
  const dims = DISPLAY_SIZES[size];

  if (!account) {
    return <span className={cn("text-muted-foreground", dims.text, className)}>{emptyLabel}</span>;
  }
  const labels = getAccountLabels(account);

  return (
    <span className={cn("flex min-w-0 items-center", dims.gap, className)}>
      <AccountMark account={account} size={size} />
      <span className="min-w-0">
        <span className={cn("block truncate font-medium", dims.text)}>{labels.name}</span>
        {detail === "type" ? (
          <span className={cn("block truncate text-muted-foreground", dims.subtext)}>
            {labels.detail}
          </span>
        ) : null}
      </span>
    </span>
  );
}
