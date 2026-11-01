"use client";

import type { TransactionFeedRow } from "@luraba/contracts";
import { AccountDisplay, MerchantDisplay } from "@/components/display";
import { Typography } from "@/components/ui/typography";
import type { TransactionLookups } from "@/queries/transactions/use-transaction-lookups-query";

function PartyCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-2 rounded-xl border border-border/70 bg-[var(--color-container-inset)] p-3">
      <Typography variant="eyebrow">{label}</Typography>
      {children}
    </div>
  );
}

/** The account (and merchant, or the destination of a transfer) a transaction touches, as cards. */
export function TransactionParties({
  lookups,
  merchantId,
  row,
}: {
  lookups: TransactionLookups;
  merchantId: string | null;
  row: TransactionFeedRow;
}) {
  const account =
    (row.creditCardId ? lookups.creditCards.find((card) => card.id === row.creditCardId) : null) ??
    lookups.accounts.find((item) => item.id === row.accountId) ??
    null;
  const isTransfer = row.originType === "transfer";
  const toAccount = lookups.accounts.find((item) => item.id === row.toAccountId) ?? null;
  const merchant = merchantId ? lookups.merchants.find((item) => item.id === merchantId) : null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <PartyCard label={isTransfer ? "From" : "Account"}>
        <AccountDisplay
          account={account}
          size="md"
          detail="full"
          emptyLabel={row.accountName ?? "No account"}
        />
      </PartyCard>
      {isTransfer ? (
        <PartyCard label="To">
          <AccountDisplay
            account={toAccount}
            size="md"
            detail="full"
            emptyLabel={row.toAccountName ?? "No account"}
          />
        </PartyCard>
      ) : (
        <PartyCard label="Merchant">
          <MerchantDisplay merchant={merchant} size="md" detail="domain" />
        </PartyCard>
      )}
    </div>
  );
}
