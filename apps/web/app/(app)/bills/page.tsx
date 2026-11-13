"use client";

import { type Bill, MAX_PER_PAGE } from "@luraba/contracts";
import * as React from "react";
import { BILL_GROUP_HEADER_HEIGHT } from "@/components/bills/bill-layout";
import { BillRow } from "@/components/bills/bill-row";
import { BillSheet } from "@/components/bills/bill-sheet";
import { BillsMonthSummary } from "@/components/bills/bills-month-summary";
import { EmptyState } from "@/components/empty-state";
import { MonthPresetButton, useMonthFilter } from "@/components/filters";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { PageAddButton } from "@/components/finance/page-add-button";
import { PERMISSIONS, useCan } from "@/components/permissions";
import { DataBoundary } from "@/components/states";
import { useEntityDisclosure } from "@/hooks/use-disclosure";
import { describeBillSchedule } from "@/lib/bills";
import { formatMonthKeyLabel } from "@/lib/credit-card-invoices";
import { cn } from "@/lib/utils";
import { useMarkOccurrencePaidMutation } from "@/mutations/bills/use-bill-mutations";
import { useBillForecastQuery, useBillsQuery } from "@/queries/bills/use-bills-queries";
import { BillsEmpty } from "./_empty";
import { BillsError } from "./_error";
import { BillsLoading } from "./_loading";

function GroupHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className={cn("flex items-center gap-2", BILL_GROUP_HEADER_HEIGHT)}>
      <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h2>
      <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
    </div>
  );
}

function monthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number) as [number, number];
  const last = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}

export default function BillsPage() {
  const { month, setMonth, timezone, language } = useMonthFilter();
  const can = useCan();
  const sheet = useEntityDisclosure<Bill>();
  const range = React.useMemo(() => monthRange(month), [month]);
  const billsQuery = useBillsQuery({ perPage: MAX_PER_PAGE });
  const forecast = useBillForecastQuery(range);
  const markPaid = useMarkOccurrencePaidMutation({ successToast: { title: "Marked as paid" } });
  const bills = billsQuery.data?.data ?? [];
  const billsById = React.useMemo(() => new Map(bills.map((bill) => [bill.id, bill])), [bills]);
  const items = forecast.data?.items ?? [];
  const canMarkPaid = can(PERMISSIONS.BILLS_UPDATE);
  const monthLabel = formatMonthKeyLabel(month, language);

  const byDate = (a: { dueDate: string }, b: { dueDate: string }) =>
    a.dueDate.localeCompare(b.dueDate);
  const overdue = items.filter((item) => item.state === "overdue").sort(byDate);
  const upcoming = items.filter((item) => item.state === "scheduled").sort(byDate);
  const paid = items.filter((item) => item.state === "paid").sort(byDate);
  const skipped = items.filter((item) => item.state === "skipped").sort(byDate);
  const groups = [
    { title: "Overdue", items: overdue },
    { title: "Upcoming", items: upcoming },
    { title: "Paid", items: paid },
    { title: "Skipped", items: skipped },
  ].filter((group) => group.items.length > 0);

  return (
    <InternalPageLayout
      title="Bills"
      subtitle="What is due, and what is paid."
      actions={
        <>
          <MonthPresetButton
            value={month}
            onChange={setMonth}
            timezone={timezone}
            language={language}
          />
          <PageAddButton
            label="Add bill"
            permission={PERMISSIONS.BILLS_CREATE}
            deniedMessage="Your household role cannot create bills."
            onClick={sheet.onCreate}
          />
        </>
      }
    >
      <DataBoundary
        isPending={billsQuery.isPending || forecast.isPending}
        isError={billsQuery.isError || forecast.isError}
        isEmpty={bills.length === 0}
        loading={<BillsLoading />}
        errorState={
          <BillsError
            message={(billsQuery.error ?? forecast.error)?.message}
            onRetry={() => {
              void billsQuery.refetch();
              void forecast.refetch();
            }}
          />
        }
        empty={<BillsEmpty onCreate={sheet.onCreate} />}
      >
        <div className="space-y-4">
          {items.length > 0 ? (
            <BillsMonthSummary items={items} language={language} />
          ) : (
            <EmptyState
              title={`Nothing due in ${monthLabel}`}
              description="Pick another month, or see every bill below."
            />
          )}

          {groups.map((group) => (
            <section key={group.title}>
              <GroupHeader title={group.title} count={group.items.length} />
              <ul>
                {group.items.map((item) => {
                  const bill = billsById.get(item.billId);
                  return (
                    <BillRow
                      key={item.occurrenceId}
                      billId={item.billId}
                      name={item.billName}
                      detail={bill ? describeBillSchedule(bill) : undefined}
                      dueDate={item.dueDate}
                      amount={item.expectedAmount}
                      currencyCode={item.currencyCode}
                      state={item.state}
                      language={language}
                      canMarkPaid={canMarkPaid}
                      onMarkPaid={() =>
                        markPaid.mutate({ id: item.billId, occurrenceId: item.occurrenceId })
                      }
                    />
                  );
                })}
              </ul>
            </section>
          ))}

          <section>
            <GroupHeader title="All bills" count={bills.length} />
            <ul>
              {bills.map((bill) => (
                <BillRow
                  key={bill.id}
                  billId={bill.id}
                  name={bill.name}
                  detail={describeBillSchedule(bill)}
                  amount={bill.summary.nextExpectedAmount ?? bill.expectedAmount}
                  currencyCode={bill.currencyCode}
                  state={bill.status === "active" ? null : bill.status}
                  language={language}
                />
              ))}
            </ul>
          </section>
        </div>
      </DataBoundary>
      <BillSheet open={sheet.isOpen} onOpenChange={sheet.setIsOpen} bill={sheet.entity} />
    </InternalPageLayout>
  );
}
