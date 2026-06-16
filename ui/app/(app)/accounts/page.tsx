import Link from "next/link";

import { CreditCardPreview } from "@/components/finance/credit-card-preview";
import { MoneyValue } from "@/components/finance/money-value";
import { PageHeader } from "@/components/finance/page-header";
import { SectionPanel } from "@/components/finance/section-panel";
import { StatusPill } from "@/components/finance/status-pill";
import { SummaryCard } from "@/components/finance/summary-card";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { accountDirectory, showcaseCreditCards, showcaseUser } from "@/lib/mock-data";

export default function AccountsPage() {
  const assetAccounts = accountDirectory.filter((account) => account.classification === "Asset");
  const liabilityAccounts = accountDirectory.filter((account) => account.classification === "Liability");
  const assetTotal = assetAccounts.reduce((total, account) => total + account.balance, 0);
  const liabilityTotal = liabilityAccounts.reduce((total, account) => total + account.balance, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Accounts"
        actions={
          <>
            <Button variant="outline" className="rounded-full">
              New account card
            </Button>
            <Button className="rounded-full">New liability card</Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <SummaryCard
          label="Assets"
          value={<MoneyValue amount={assetTotal} currencyCode="BRL" />}
          hint={`${assetAccounts.length} static asset surfaces`}
          accent="positive"
        />
        <SummaryCard
          label="Liabilities"
          value={<MoneyValue amount={liabilityTotal} currencyCode="BRL" />}
          hint={`${liabilityAccounts.length} liability surfaces`}
          accent="negative"
        />
        <SummaryCard
          label="Net position"
          value={<MoneyValue amount={assetTotal - liabilityTotal} currencyCode="BRL" />}
          hint="Purely computed from local mock data"
          accent="brand"
        />
      </div>

      <SectionPanel title="Account library" description="A static directory for experimenting with density, copy, and card treatment.">
        <div className="grid gap-4 lg:grid-cols-2">
          {accountDirectory.map((account) => (
            <Link
              key={account.id}
              href={`/accounts/${account.id}`}
              className="rounded-[1.4rem] border border-border/70 bg-[var(--color-container-inset)] p-5 transition hover:border-primary/35 hover:bg-background"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <Typography variant="small-strong">{account.name}</Typography>
                  <Typography variant="small-muted">
                    {account.institution} • {account.type}
                  </Typography>
                </div>
                <StatusPill tone={account.classification === "Asset" ? "positive" : "negative"}>
                  {account.classification}
                </StatusPill>
              </div>

              <div className="mt-5 flex items-end justify-between gap-4">
                <div>
                  <MoneyValue amount={account.balance} currencyCode={showcaseUser.currencyCode} className="text-xl" />
                  <Typography variant="small-muted" className="mt-2">
                    {account.note}
                  </Typography>
                </div>
                <Typography variant="small" className="text-foreground/76">
                  {account.change}
                </Typography>
              </div>
            </Link>
          ))}
        </div>
      </SectionPanel>

      <SectionPanel title="Credit card visuals" description="Keep the financial objects visible while the workflows stay unplugged.">
        <div className="grid gap-4 lg:grid-cols-2">
          {showcaseCreditCards.map((card) => (
            <CreditCardPreview
              key={card.id}
              brand={card.brand}
              last4={card.last4}
              name={showcaseUser.name}
              color={card.color}
              subtitle={`Closing ${card.closingDay} • Due ${card.dueDay}`}
              balance={<MoneyValue amount={card.balance} currencyCode="BRL" className="text-white" />}
            />
          ))}
        </div>
      </SectionPanel>
    </div>
  );
}
