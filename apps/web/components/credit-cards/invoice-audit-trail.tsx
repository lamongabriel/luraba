"use client";

import { formatShortDate } from "@luraba/domain";
import { AmountDisplay } from "@/components/display";
import { PageSection } from "@/components/finance/page-section";
import { ListRow } from "@/components/lists/list-row";
import { DataBoundary } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";
import { useInstallmentAuditsQuery } from "@/queries/credit-cards/use-credit-cards-query";

const SOURCE_LABELS = {
  statement: "Statement import",
  override: "Override",
  manual: "Edited",
} as const;

/**
 * Every cent Luraba changed on one invoice and why: the statement import that corrected it, a manual edit or an
 * override of a locked invoice. Shows nothing for an invoice that was never changed.
 */
export function InvoiceAuditTrail({
  creditCardId,
  cycleId,
  currencyCode,
  language,
  precision,
}: {
  creditCardId: string;
  cycleId: string;
  currencyCode: string;
  language: string;
  precision: number;
}) {
  const query = useInstallmentAuditsQuery(creditCardId, { billingCycleId: cycleId });
  const audits = query.data ?? [];
  if (!query.isPending && !query.isError && audits.length === 0) return null;

  const money = (amount: number) => (
    <AmountDisplay
      amount={amount}
      currencyCode={currencyCode}
      language={language}
      precision={precision}
      showSign={false}
    />
  );

  return (
    <PageSection title="Changes to this invoice" description="Every amount Luraba changed, and why">
      <DataBoundary
        isPending={query.isPending}
        isError={query.isError}
        error={query.error}
        onRetry={() => void query.refetch()}
        errorTitle="Couldn't load the changes"
        loading={
          <div className="space-y-2" aria-busy="true">
            {[0, 1, 2].map((key) => (
              <Skeleton key={key} className="h-14 w-full" />
            ))}
          </div>
        }
      >
        <div>
          {audits.map((audit) => (
            <ListRow
              key={audit.id}
              title={audit.note}
              subtitle={
                <>
                  Installment {audit.installmentNumber} · {money(audit.previousAmount)} →{" "}
                  {money(audit.newAmount)}
                </>
              }
              amount={money(audit.newAmount - audit.previousAmount)}
              meta={`${SOURCE_LABELS[audit.source]} · ${formatShortDate(audit.createdAt.slice(0, 10), language)}`}
            />
          ))}
        </div>
      </DataBoundary>
    </PageSection>
  );
}
