"use client";

import { MAX_PER_PAGE, type Split } from "@luraba/contracts";
import Link from "next/link";
import { MemberDisplay } from "@/components/display";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { MoneyValue } from "@/components/finance/money-value";
import { SectionReveal } from "@/components/motion/reveal";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";
import { SplitSheet } from "@/components/splits/split-sheet";
import { DataBoundary } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Typography } from "@/components/ui/typography";
import { useDisclosure } from "@/hooks/use-disclosure";
import { useSplitsQuery } from "@/queries/splits/use-splits-queries";
import { useAuthSessionStore } from "@/stores/auth-session-store";
import { SplitsEmpty } from "./_empty";
import { SplitsError } from "./_error";
import { SplitsLoading } from "./_loading";

function SplitCard({ split, language }: { split: Split; language: string }) {
  const { summary } = split;
  const progress =
    summary.owed > 0 ? Math.min(100, Math.round((summary.received / summary.owed) * 100)) : 0;

  return (
    <Link
      href={`/splits/${split.id}`}
      className="block rounded-xl border border-border/60 p-4 transition-colors hover:bg-muted/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Typography variant="small-strong" className="truncate">
            {split.title}
          </Typography>
          <Typography variant="small-muted">
            {summary.participantCount} {summary.participantCount === 1 ? "person" : "people"}
          </Typography>
          <MemberDisplay userId={split.createdByUserId} size="xs" className="mt-1" />
        </div>
        <div className="flex shrink-0 gap-2">
          {summary.overdueCount > 0 ? (
            <Badge variant="destructive">{summary.overdueCount} overdue</Badge>
          ) : null}
          {split.status === "closed" ? <Badge variant="outline">Closed</Badge> : null}
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <Typography variant="small-muted">
          <MoneyValue
            amount={summary.received}
            currencyCode={split.currencyCode}
            language={language}
          />{" "}
          of{" "}
          <MoneyValue amount={summary.owed} currencyCode={split.currencyCode} language={language} />
        </Typography>
        <Typography variant="small-muted">
          {summary.unpaidParticipantNames.length > 0
            ? `Waiting on ${summary.unpaidParticipantNames.join(", ")}`
            : "All settled"}
        </Typography>
      </div>
    </Link>
  );
}

export default function SplitsPage() {
  const sheet = useDisclosure();
  const language = useAuthSessionStore((state) => state.user?.preferences.language ?? "en");
  const query = useSplitsQuery({ perPage: MAX_PER_PAGE });
  const splits = query.data?.data ?? [];

  const content = (
    <DataBoundary
      isPending={query.isPending}
      isError={query.isError}
      isEmpty={splits.length === 0}
      loading={<SplitsLoading />}
      errorState={
        <SplitsError message={query.error?.message} onRetry={() => void query.refetch()} />
      }
      empty={<SplitsEmpty onCreate={sheet.onOpen} />}
    >
      <SectionReveal className="grid gap-3 md:grid-cols-2">
        {splits.map((split) => (
          <SplitCard key={split.id} split={split} language={language} />
        ))}
      </SectionReveal>
    </DataBoundary>
  );

  return (
    <InternalPageLayout
      title="Splits"
      subtitle="Shared expenses and who still owes whom."
      actions={
        <PermissionButton
          permission={PERMISSIONS.SPLITS_CREATE}
          deniedMessage="Your household role cannot create splits."
          onClick={sheet.onOpen}
        >
          New split
        </PermissionButton>
      }
    >
      {content}
      <SplitSheet mode="create" open={sheet.isOpen} onOpenChange={sheet.setIsOpen} />
    </InternalPageLayout>
  );
}
