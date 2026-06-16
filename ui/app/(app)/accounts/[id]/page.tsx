import Link from "next/link";

import { MoneyValue } from "@/components/finance/money-value";
import { PageHeader } from "@/components/finance/page-header";
import { SectionPanel } from "@/components/finance/section-panel";
import { StatusPill } from "@/components/finance/status-pill";
import { SummaryCard } from "@/components/finance/summary-card";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { accountDetailSnapshots, accountDirectory, showcaseUser } from "@/lib/mock-data";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = accountDirectory.find((item) => item.id === id) ?? accountDirectory[0];
  const snapshot = accountDetailSnapshots[account.id as keyof typeof accountDetailSnapshots] ?? accountDetailSnapshots["xp-checking"];

  return (
    <div className="space-y-8">
      <PageHeader
        title={account.name}
        actions={
          <>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/accounts">Back to accounts</Link>
            </Button>
            <StatusPill tone={account.classification === "Asset" ? "positive" : "negative"}>
              {account.classification}
            </StatusPill>
          </>
        }
      />

      <SectionPanel title={snapshot.eyebrow} description={snapshot.summary}>
        <div className="grid gap-4 md:grid-cols-3">
          {snapshot.highlights.map((item) => (
            <SummaryCard
              key={item.label}
              label={item.label}
              value={<MoneyValue amount={item.amount} currencyCode={showcaseUser.currencyCode} signed={item.amount < 0} />}
              hint={account.institution}
              accent={item.amount >= 0 ? "positive" : "negative"}
            />
          ))}
        </div>
      </SectionPanel>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionPanel title="Visual summary" description="Use this page to refine detail-view composition and pacing.">
          <div className="rounded-[1.4rem] border border-border/70 bg-[var(--color-container-inset)] p-5">
            <Typography variant="eyebrow">{account.type}</Typography>
            <Typography as="p" variant="page-title" className="mt-2">
              <MoneyValue amount={account.balance} currencyCode={showcaseUser.currencyCode} />
            </Typography>
            <Typography variant="body-muted" className="mt-4">
              {account.note}
            </Typography>
            <div className="mt-5 flex items-center justify-between">
              <Typography variant="small-muted">Month change</Typography>
              <Typography variant="small">{account.change}</Typography>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel title="Recent entries" description="Local activity cards that keep the detail page alive while flows are offline.">
          <div className="space-y-3">
            {snapshot.activity.map((activity) => (
              <div key={`${activity.label}-${activity.date}`} className="flex items-center justify-between gap-4 rounded-[1rem] border border-border/70 bg-[var(--color-container-inset)] px-4 py-4">
                <div>
                  <Typography variant="small-strong">{activity.label}</Typography>
                  <Typography variant="small-muted">{activity.date}</Typography>
                </div>
                <MoneyValue amount={activity.amount} currencyCode={showcaseUser.currencyCode} signed className="text-base" />
              </div>
            ))}
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}
