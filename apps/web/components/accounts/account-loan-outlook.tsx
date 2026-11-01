"use client";

import { Calendar03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { AccountDetails } from "@luraba/contracts";
import { formatISODate, formatShortDate, getTodayInTimezone, summarizeLoan } from "@luraba/domain";

import { AmountDisplay } from "@/components/display";
import { EmptyState } from "@/components/empty-state";
import { InfoItem } from "@/components/finance/info-item";
import { PanelCard } from "@/components/finance/panel-card";
import { formatCurrency, formatNumber } from "@/lib/finance";
import { useAuthSessionStore } from "@/stores/auth-session-store";

/**
 * What a loan's terms predict: next payment, payments made, interest paid so far and the payoff
 * date, computed with `summarizeLoan` from `@luraba/domain`. It follows the contract terms, not
 * the actual payments: the real balance is the account's balance.
 */
export function AccountLoanOutlook({
  account,
  language,
  precision,
}: {
  account: AccountDetails;
  language: string;
  precision: number;
}) {
  const timezone = useAuthSessionStore((state) => state.user?.preferences.timezone ?? "UTC");
  const details = account.details;
  if (details.kind !== "loan") return null;

  const today = formatISODate(getTodayInTimezone(timezone));
  const outlook = summarizeLoan(
    {
      principal: details.originalPrincipal,
      annualRatePercent: details.annualInterestRate,
      paymentAmount: details.paymentAmount,
      termMonths: details.termMonths,
      frequency: details.paymentFrequency,
      startDate: details.startDate,
    },
    today,
  );
  const money = (amount: number) => (
    <AmountDisplay
      amount={amount}
      currencyCode={account.currencyCode}
      language={language}
      precision={precision}
      kind="neutral"
    />
  );

  return (
    <PanelCard
      title="Loan outlook"
      description="Projected from the loan terms"
      icon={<HugeiconsIcon icon={Calendar03Icon} strokeWidth={2} />}
    >
      {outlook ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoItem
            label="Next payment"
            value={
              outlook.nextPayment ? (
                <>
                  {money(outlook.nextPayment.payment)} on{" "}
                  {formatShortDate(outlook.nextPayment.dueDate, language)}
                </>
              ) : (
                "Schedule finished"
              )
            }
            description={
              outlook.nextPayment
                ? `${formatCurrency(outlook.nextPayment.interest, account.currencyCode, language, undefined, precision)} of interest`
                : undefined
            }
          />
          <InfoItem
            label="Payoff date"
            value={
              outlook.payoffDate ? formatShortDate(outlook.payoffDate, language) : "Not reached"
            }
            description={
              outlook.payoffDate ? undefined : "The payment does not cover the interest."
            }
          />
          <InfoItem
            label="Payments made"
            value={`${formatNumber(outlook.paymentsMade, language)} of ${formatNumber(outlook.paymentsTotal, language)}`}
          />
          <InfoItem label="Interest paid so far" value={money(outlook.interestPaid)} />
          <InfoItem label="Scheduled balance today" value={money(outlook.scheduledBalance)} />
          <InfoItem label="Total interest over the loan" value={money(outlook.totalInterest)} />
        </div>
      ) : (
        <EmptyState
          variant="embedded"
          title="Add the loan terms"
          description="Principal, start date, payment amount and frequency let Luraba project the schedule. Open Edit to fill them in."
        />
      )}
    </PanelCard>
  );
}
