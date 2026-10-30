"use client";

import { Delete02Icon, MoreHorizontalIcon, PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { SplitInstallment, SplitParticipant } from "@luraba/contracts";
import { formatShortDate } from "@luraba/domain";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { MoneyValue } from "@/components/finance/money-value";
import { PERMISSIONS, useCan } from "@/components/permissions";
import { AdjustInstallmentModal } from "@/components/splits/adjust-installment-modal";
import { LinkIncomeModal } from "@/components/splits/link-income-modal";
import { SplitSheet } from "@/components/splits/split-sheet";
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
import { Typography } from "@/components/ui/typography";
import { INSTALLMENT_STATE_LABELS } from "@/lib/splits";
import {
  useDeleteSplitMutation,
  useReceiveInstallmentMutation,
  useRemoveInstallmentMutation,
  useRemoveParticipantMutation,
  useResetInstallmentMutation,
  useSkipInstallmentMutation,
  useWriteOffInstallmentMutation,
} from "@/mutations/splits/use-split-mutations";
import { useSplitQuery } from "@/queries/splits/use-splits-queries";
import { useAuthSessionStore } from "@/stores/auth-session-store";
import { SplitDetailError } from "./_error";
import { SplitDetailLoading } from "./_loading";

const STATE_BADGE: Record<
  SplitInstallment["state"],
  "default" | "destructive" | "outline" | "secondary"
> = {
  scheduled: "outline",
  overdue: "destructive",
  received: "secondary",
  skipped: "outline",
  written_off: "outline",
};

function InstallmentRow({
  installment,
  splitId,
  currencyCode,
  language,
  canUpdate,
  onLink,
  onAdjust,
}: {
  installment: SplitInstallment;
  splitId: string;
  currencyCode: string;
  language: string;
  canUpdate: boolean;
  onLink: (installment: SplitInstallment) => void;
  onAdjust: (installment: SplitInstallment) => void;
}) {
  const target = { id: splitId, installmentId: installment.id };
  const receive = useReceiveInstallmentMutation();
  const skip = useSkipInstallmentMutation();
  const writeOff = useWriteOffInstallmentMutation();
  const reset = useResetInstallmentMutation();
  const remove = useRemoveInstallmentMutation();
  const busy =
    receive.isPending ||
    skip.isPending ||
    writeOff.isPending ||
    reset.isPending ||
    remove.isPending;
  const open = installment.state === "scheduled" || installment.state === "overdue";
  const actual = installment.transaction;

  return (
    <div className="flex items-center gap-3 border-b border-border/60 py-2.5 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Typography variant="small-strong">
            {formatShortDate(installment.dueDate, language)}
          </Typography>
          <Badge variant={STATE_BADGE[installment.state]}>
            {INSTALLMENT_STATE_LABELS[installment.state]}
          </Badge>
        </div>
        {installment.graceUntil && open ? (
          <Typography variant="small-muted">
            Grace until {formatShortDate(installment.graceUntil, language)}
          </Typography>
        ) : null}
        {actual ? (
          <Typography variant="small-muted" className="truncate">
            Received as “{actual.description}” on {formatShortDate(actual.postedDate, language)}
          </Typography>
        ) : null}
      </div>

      <MoneyValue
        amount={actual?.amount ?? installment.expectedAmount}
        currencyCode={currencyCode}
        language={language}
        className="shrink-0 text-sm"
      />

      {canUpdate ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" disabled={busy}>
              <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
              <span className="sr-only">Installment actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {open ? (
              <>
                <DropdownMenuItem onSelect={() => onLink(installment)}>
                  Link a payment received
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => receive.mutate(target)}>
                  Mark as received
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => skip.mutate(target)}>Skip</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => writeOff.mutate(target)}>
                  I'll take the loss
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onSelect={() => reset.mutate(target)}>Reopen</DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onAdjust(installment)}>
              Change date, grace or amount
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => remove.mutate(target)}>
              Remove installment
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}

function ParticipantCard({
  participant,
  splitId,
  currencyCode,
  language,
  canUpdate,
  onLink,
  onAdjust,
}: {
  participant: SplitParticipant;
  splitId: string;
  currencyCode: string;
  language: string;
  canUpdate: boolean;
  onLink: (installment: SplitInstallment) => void;
  onAdjust: (installment: SplitInstallment) => void;
}) {
  const remove = useRemoveParticipantMutation();
  const { totals } = participant;

  return (
    <section className="rounded-xl border border-border/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Typography variant="small-strong">{participant.name}</Typography>
          <Typography variant="small-muted">
            {totals.receivedCount} of {totals.installmentCount} paid
            {totals.nextDueDate ? ` · next ${formatShortDate(totals.nextDueDate, language)}` : ""}
          </Typography>
        </div>
        <div className="flex items-center gap-2">
          {totals.overdueCount > 0 ? (
            <Badge variant="destructive">{totals.overdueCount} overdue</Badge>
          ) : null}
          {totals.outstanding === 0 && totals.installmentCount > 0 ? (
            <Badge variant="secondary">Settled</Badge>
          ) : null}
          {canUpdate ? (
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={remove.isPending}
              onClick={() => remove.mutate({ id: splitId, participantId: participant.id })}
            >
              <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
              <span className="sr-only">Remove {participant.name}</span>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <div>
          <Typography variant="small-muted">Received</Typography>
          <MoneyValue amount={totals.received} currencyCode={currencyCode} language={language} />
        </div>
        <div>
          <Typography variant="small-muted">Still owes</Typography>
          <MoneyValue amount={totals.outstanding} currencyCode={currencyCode} language={language} />
        </div>
        <div>
          <Typography variant="small-muted">Written off</Typography>
          <MoneyValue amount={totals.writtenOff} currencyCode={currencyCode} language={language} />
        </div>
      </div>

      <div className="mt-3">
        {participant.installments.map((installment) => (
          <InstallmentRow
            key={installment.id}
            installment={installment}
            splitId={splitId}
            currencyCode={currencyCode}
            language={language}
            canUpdate={canUpdate}
            onLink={onLink}
            onAdjust={onAdjust}
          />
        ))}
      </div>
    </section>
  );
}

export default function SplitDetailsPage() {
  const { id = "" } = useParams<{ id: string }>();
  const router = useRouter();
  const can = useCan();
  const canUpdate = can(PERMISSIONS.SPLITS_UPDATE);
  const canDelete = can(PERMISSIONS.SPLITS_DELETE);
  const language = useAuthSessionStore((state) => state.user?.preferences.language ?? "en");

  const [editOpen, setEditOpen] = React.useState(false);
  const [personOpen, setPersonOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [linkTarget, setLinkTarget] = React.useState<SplitInstallment>();
  const [adjustTarget, setAdjustTarget] = React.useState<SplitInstallment>();

  const query = useSplitQuery(id);
  const remove = useDeleteSplitMutation({
    onSuccess: () => router.push("/splits"),
    successToast: { title: "Split deleted" },
  });
  const split = query.data;

  if (query.isPending) return <SplitDetailLoading />;

  if (query.isError || !split) {
    return <SplitDetailError message={query.error?.message} onRetry={() => void query.refetch()} />;
  }

  const { summary } = split;

  return (
    <InternalPageLayout
      title={split.title}
      createdBy={split.createdByUserId}
      subtitle="Who owes what, installments and payments."
      back={{ href: "/splits", label: "Splits" }}
      actions={
        canUpdate || canDelete ? (
          <div className="flex items-center gap-2">
            {canUpdate ? (
              <>
                <Button variant="outline" onClick={() => setPersonOpen(true)}>
                  Add person
                </Button>
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                  Edit
                </Button>
              </>
            ) : null}
            {canDelete ? (
              <Button variant="outline" size="icon" onClick={() => setDeleteOpen(true)}>
                <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                <span className="sr-only">Delete split</span>
              </Button>
            ) : null}
          </div>
        ) : null
      }
    >
      {split.description ? <Typography variant="body-muted">{split.description}</Typography> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Expected back", summary.owed],
          ["Received", summary.received],
          ["Still outstanding", summary.outstanding],
          ["Written off", summary.writtenOff],
        ].map(([label, amount]) => (
          <div key={label} className="rounded-xl border border-border/60 p-4">
            <Typography variant="small-muted">{label}</Typography>
            <MoneyValue
              amount={amount as number}
              currencyCode={split.currencyCode}
              language={language}
              className="mt-1 block text-lg"
            />
          </div>
        ))}
      </div>

      {summary.unpaidParticipantNames.length > 0 ? (
        <Typography variant="small-muted">
          Still waiting on {summary.unpaidParticipantNames.join(", ")}.
        </Typography>
      ) : split.participants.length > 0 ? (
        <Typography variant="small-muted">Everyone is settled.</Typography>
      ) : null}

      <div className="space-y-3">
        {split.participants.length === 0 ? (
          <Typography variant="small-muted">No one added yet.</Typography>
        ) : (
          split.participants.map((participant) => (
            <ParticipantCard
              key={participant.id}
              participant={participant}
              splitId={split.id}
              currencyCode={split.currencyCode}
              language={language}
              canUpdate={canUpdate}
              onLink={setLinkTarget}
              onAdjust={setAdjustTarget}
            />
          ))
        )}
      </div>

      <SplitSheet mode="edit" open={editOpen} onOpenChange={setEditOpen} split={split} />
      <SplitSheet mode="person" open={personOpen} onOpenChange={setPersonOpen} split={split} />
      <LinkIncomeModal
        open={Boolean(linkTarget)}
        onOpenChange={(next) => !next && setLinkTarget(undefined)}
        splitId={split.id}
        installmentId={linkTarget?.id}
        currencyCode={split.currencyCode}
        language={language}
      />
      <AdjustInstallmentModal
        installment={adjustTarget}
        splitId={split.id}
        onClose={() => setAdjustTarget(undefined)}
      />
      <Modal open={deleteOpen} onOpenChange={setDeleteOpen}>
        <ModalContent
          variant="destructive"
          title="Delete split?"
          description={`"${split.title}" and everyone's payment tracking will be removed. Linked transactions are kept.`}
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
            confirmLabel="Delete split"
            confirmVariant="destructive"
            onConfirm={() => remove.mutate(split.id)}
            isLoading={remove.isPending}
            loadingLabel="Deleting..."
          />
        </ModalContent>
      </Modal>
    </InternalPageLayout>
  );
}
