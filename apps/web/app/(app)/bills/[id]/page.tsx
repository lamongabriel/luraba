"use client";

import { Delete02Icon, MoreHorizontalIcon, PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { BillOccurrence } from "@luraba/contracts";
import { formatShortDate } from "@luraba/domain";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { BillSheet } from "@/components/bills/bill-sheet";
import { LinkTransactionModal } from "@/components/bills/link-transaction-modal";
import { ErrorState } from "@/components/error-state";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { MoneyValue } from "@/components/finance/money-value";
import { PERMISSIONS, useCan } from "@/components/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Modal, ModalBody, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { describeBillSchedule, OCCURRENCE_STATE_LABELS } from "@/lib/bills";
import {
  useCancelBillMutation,
  useDeleteBillMutation,
  useMarkOccurrencePaidMutation,
  usePauseBillMutation,
  useResetOccurrenceMutation,
  useResumeBillMutation,
  useSkipOccurrenceMutation,
} from "@/mutations/bills/use-bill-mutations";
import { useBillOccurrencesQuery, useBillQuery } from "@/queries/bills/use-bills-queries";
import { useAuthSessionStore } from "@/stores/auth-session-store";

const STATE_BADGE: Record<
  BillOccurrence["state"],
  "default" | "destructive" | "outline" | "secondary"
> = {
  scheduled: "outline",
  overdue: "destructive",
  paid: "secondary",
  skipped: "outline",
};

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 p-4">
      <Typography variant="small-muted">{label}</Typography>
      <div className="mt-1 text-lg">{children}</div>
    </div>
  );
}

function OccurrenceRow({
  occurrence,
  currencyCode,
  language,
  canUpdate,
  onLink,
}: {
  occurrence: BillOccurrence;
  currencyCode: string;
  language: string;
  canUpdate: boolean;
  onLink: (occurrence: BillOccurrence) => void;
}) {
  const target = { id: occurrence.billId, occurrenceId: occurrence.id };
  const paid = useMarkOccurrencePaidMutation();
  const skip = useSkipOccurrenceMutation();
  const reset = useResetOccurrenceMutation();
  const busy = paid.isPending || skip.isPending || reset.isPending;
  const open = occurrence.state === "scheduled" || occurrence.state === "overdue";
  const actual = occurrence.transaction;

  return (
    <div className="flex items-center gap-3 border-b border-border/60 py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Typography variant="small-strong">
            {formatShortDate(occurrence.dueDate, language)}
          </Typography>
          {occurrence.installmentNumber ? (
            <Typography variant="small-muted">#{occurrence.installmentNumber}</Typography>
          ) : null}
          <Badge variant={STATE_BADGE[occurrence.state]}>
            {OCCURRENCE_STATE_LABELS[occurrence.state]}
          </Badge>
        </div>
        {actual ? (
          <Typography variant="small-muted" className="truncate">
            Paid with “{actual.description}” on {formatShortDate(actual.postedDate, language)}
          </Typography>
        ) : null}
      </div>

      <div className="shrink-0 text-right">
        {actual ? (
          <>
            <MoneyValue
              amount={actual.amount}
              currencyCode={actual.currencyCode}
              language={language}
              className="block text-sm"
            />
            {actual.amount !== occurrence.expectedAmount ? (
              <Typography variant="small-muted">
                expected{" "}
                <MoneyValue
                  amount={occurrence.expectedAmount}
                  currencyCode={currencyCode}
                  language={language}
                />
              </Typography>
            ) : null}
          </>
        ) : (
          <MoneyValue
            amount={occurrence.expectedAmount}
            currencyCode={currencyCode}
            language={language}
            className="text-sm"
          />
        )}
      </div>

      {canUpdate ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" disabled={busy}>
              <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
              <span className="sr-only">Payment actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {open ? (
              <>
                <DropdownMenuItem onSelect={() => onLink(occurrence)}>
                  Link a transaction
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => paid.mutate(target)}>
                  Mark as paid
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => skip.mutate(target)}>Skip</DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onSelect={() => reset.mutate(target)}>Reopen</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}

export default function BillDetailsPage() {
  const { id = "" } = useParams<{ id: string }>();
  const router = useRouter();
  const can = useCan();
  const canUpdate = can(PERMISSIONS.BILLS_UPDATE);
  const canDelete = can(PERMISSIONS.BILLS_DELETE);
  const language = useAuthSessionStore((state) => state.user?.preferences.language ?? "en");

  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [linkTarget, setLinkTarget] = React.useState<BillOccurrence>();

  const billQuery = useBillQuery(id);
  const occurrencesQuery = useBillOccurrencesQuery(id, {
    perPage: 100,
    sort: "dueDate",
    sortDirection: "desc",
  });

  const pause = usePauseBillMutation();
  const resume = useResumeBillMutation();
  const cancel = useCancelBillMutation();
  const remove = useDeleteBillMutation({
    onSuccess: () => router.push("/bills"),
    successToast: { title: "Bill deleted" },
  });

  const bill = billQuery.data;

  if (billQuery.isPending) {
    return (
      <InternalPageLayout
        title="Bill"
        subtitle="Schedule, upcoming occurrences and payment history."
        back={{ href: "/bills", label: "Bills" }}
      >
        <Skeleton className="h-40 rounded-xl bg-muted/50" />
      </InternalPageLayout>
    );
  }

  if (billQuery.isError || !bill) {
    return (
      <InternalPageLayout
        title="Bill"
        subtitle="Schedule, upcoming occurrences and payment history."
        back={{ href: "/bills", label: "Bills" }}
      >
        <ErrorState
          title="Couldn't load this bill"
          description={billQuery.error?.message || "It may have been deleted."}
          onRetry={() => void billQuery.refetch()}
        />
      </InternalPageLayout>
    );
  }

  const { summary } = bill;
  const occurrences = occurrencesQuery.data?.data ?? [];

  return (
    <InternalPageLayout
      title={bill.name}
      createdBy={bill.createdByUserId}
      subtitle="Schedule, upcoming occurrences and payment history."
      back={{ href: "/bills", label: "Bills" }}
      actions={
        canUpdate || canDelete ? (
          <div className="flex items-center gap-2">
            {canUpdate ? (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                Edit
              </Button>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
                  <span className="sr-only">Bill actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {canUpdate && bill.status === "active" ? (
                  <DropdownMenuItem onSelect={() => pause.mutate(bill.id)}>Pause</DropdownMenuItem>
                ) : null}
                {canUpdate && bill.status === "paused" ? (
                  <DropdownMenuItem onSelect={() => resume.mutate(bill.id)}>
                    Resume
                  </DropdownMenuItem>
                ) : null}
                {canUpdate && bill.status !== "canceled" ? (
                  <DropdownMenuItem onSelect={() => cancel.mutate(bill.id)}>
                    Cancel bill
                  </DropdownMenuItem>
                ) : null}
                {canUpdate && canDelete ? <DropdownMenuSeparator /> : null}
                {canDelete ? (
                  <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
                    <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                    Delete
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <Typography variant="small-muted">{describeBillSchedule(bill)}</Typography>
        {bill.status !== "active" ? (
          <Badge variant="outline" className="capitalize">
            {bill.status}
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Next payment">
          {summary.nextDueDate ? (
            <>
              <span className="block text-base">
                {formatShortDate(summary.nextDueDate, language)}
              </span>
              <MoneyValue
                amount={summary.nextExpectedAmount ?? bill.expectedAmount}
                currencyCode={bill.currencyCode}
                language={language}
                className="text-sm text-muted-foreground"
              />
            </>
          ) : (
            "None"
          )}
        </Stat>
        <Stat label={bill.installmentCount ? "Installments" : "Payments made"}>
          {bill.installmentCount ? (
            <>
              {summary.paidCount} of {bill.installmentCount}
              <span className="block text-sm text-muted-foreground">
                {summary.remainingCount} left
              </span>
            </>
          ) : (
            summary.paidCount
          )}
        </Stat>
        <Stat label="Average paid">
          {summary.averagePaid !== null ? (
            <MoneyValue
              amount={summary.averagePaid}
              currencyCode={bill.currencyCode}
              language={language}
            />
          ) : (
            "—"
          )}
        </Stat>
        <Stat label="Total paid">
          <MoneyValue
            amount={summary.totalPaid}
            currencyCode={bill.currencyCode}
            language={language}
          />
        </Stat>
      </div>

      <section>
        <Typography variant="small-strong" className="mb-1">
          Payments
        </Typography>
        {occurrencesQuery.isPending ? (
          <Skeleton className="h-24 rounded-xl bg-muted/50" />
        ) : occurrences.length === 0 ? (
          <Typography variant="small-muted">No payments scheduled.</Typography>
        ) : (
          occurrences.map((occurrence) => (
            <OccurrenceRow
              key={occurrence.id}
              occurrence={occurrence}
              currencyCode={bill.currencyCode}
              language={language}
              canUpdate={canUpdate}
              onLink={setLinkTarget}
            />
          ))
        )}
      </section>

      <BillSheet open={editOpen} onOpenChange={setEditOpen} bill={bill} />
      <LinkTransactionModal
        open={Boolean(linkTarget)}
        onOpenChange={(next) => !next && setLinkTarget(undefined)}
        billId={bill.id}
        occurrenceId={linkTarget?.id}
        currencyCode={bill.currencyCode}
        language={language}
      />
      <Modal open={deleteOpen} onOpenChange={setDeleteOpen}>
        <ModalContent
          variant="destructive"
          title="Delete bill?"
          description={`"${bill.name}" and its payment history will be removed. Linked transactions are kept.`}
          isLoading={remove.isPending}
          size="sm"
        >
          <ModalBody>
            {remove.errorMessage ? (
              <Typography variant="small-destructive">{remove.errorMessage}</Typography>
            ) : null}
          </ModalBody>
          <ModalFooter
            cancelLabel="Cancel"
            confirmLabel="Delete bill"
            confirmVariant="destructive"
            onConfirm={() => remove.mutate(bill.id)}
            isLoading={remove.isPending}
            loadingLabel="Deleting..."
          />
        </ModalContent>
      </Modal>
    </InternalPageLayout>
  );
}
