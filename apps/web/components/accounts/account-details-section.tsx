"use client";

import type { AccountDetails } from "@luraba/contracts";

import {
  AccountProfileDetails,
  hasAccountProfileDetails,
} from "@/components/accounts/account-profile-details";
import { Typography } from "@/components/ui/typography";

/**
 * The account's type-specific facts (loan terms, property, vehicle, wallet) and notes as a labeled
 * grid on the page. Renders nothing when there is nothing the header does not already say.
 */
export function AccountDetailsSection({
  account,
  language,
}: {
  account: AccountDetails;
  language: string;
}) {
  const hasDetails = hasAccountProfileDetails(account);
  if (!hasDetails && !account.notes) return null;

  return (
    <section aria-label="Details" className="space-y-4 border-t border-border/60 pt-8">
      <Typography as="h2" variant="section-title">
        Details
      </Typography>
      {hasDetails ? <AccountProfileDetails account={account} language={language} /> : null}
      {account.notes ? (
        <div className="space-y-1">
          <Typography variant="small-muted">Notes</Typography>
          <Typography variant="body-muted" className="whitespace-pre-wrap">
            {account.notes}
          </Typography>
        </div>
      ) : null}
    </section>
  );
}
