"use client";

import { MinusSignIcon, PencilEdit02Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { useParams } from "next/navigation";
import * as React from "react";

import { AmountDisplay, PiggyBankMark } from "@/components/display";
import { HeaderButton } from "@/components/finance/header-actions";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { PanelCard } from "@/components/finance/panel-card";
import { KpiCard, KpiGrid } from "@/components/kpi";
import { PERMISSIONS, useCan } from "@/components/permissions";
import {
  PiggyBankFundsModal,
  type PiggyFundsMode,
} from "@/components/piggy-banks/piggy-bank-funds-modal";
import { PiggyBankMovements } from "@/components/piggy-banks/piggy-bank-movements";
import { PiggyBankProjectionChart } from "@/components/piggy-banks/piggy-bank-projection-chart";
import { PiggyBankSheet } from "@/components/piggy-banks/piggy-bank-sheet";
import { useCurrencyPrecision } from "@/hooks/use-currency-precision";
import {
  usePiggyBankQuery,
  usePiggyBanksQuery,
} from "@/queries/piggy-banks/use-piggy-banks-queries";
import { useAuthSessionStore } from "@/stores/auth-session-store";
import { PiggyBankDetailError } from "./_error";
import { PiggyBankDetailLoading } from "./_loading";

export default function PiggyBankDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const can = useCan();
  const canUpdate = can(PERMISSIONS.PIGGY_BANKS_UPDATE);
  const language = useAuthSessionStore((state) => state.user?.preferences.language ?? "en");
  const precisionOf = useCurrencyPrecision();
  const query = usePiggyBankQuery(id);
  const all = usePiggyBanksQuery();
  const [editOpen, setEditOpen] = React.useState(false);
  const [mode, setMode] = React.useState<PiggyFundsMode | null>(null);

  if (query.isPending) return <PiggyBankDetailLoading />;
  if (query.isError || !query.data) {
    return (
      <PiggyBankDetailError message={query.error?.message} onRetry={() => void query.refetch()} />
    );
  }
  const piggy = query.data;
  const currency = piggy.currencyCode;
  const precision = precisionOf(currency);
  const money = { currencyCode: currency, language, precision };

  return (
    <InternalPageLayout
      title={piggy.title}
      subtitle={`${piggy.parentAccountName} · ${piggy.yield.label}`}
      back={{ href: "/piggy-banks", label: "Piggy banks" }}
      leading={<PiggyBankMark piggyBank={piggy} size="lg" />}
      actions={
        canUpdate ? (
          <>
            <HeaderButton label="Edit" icon={PencilEdit02Icon} onClick={() => setEditOpen(true)} />
            <HeaderButton
              label="Withdraw"
              icon={MinusSignIcon}
              onClick={() => setMode("withdraw")}
            />
            <HeaderButton label="Deposit" icon={PlusSignIcon} onClick={() => setMode("deposit")} />
          </>
        ) : undefined
      }
    >
      <div className="space-y-5">
        <KpiGrid columns={4}>
          <KpiCard
            title="Balance"
            value={<AmountDisplay amount={piggy.balance} {...money} size="lg" />}
          />
          <KpiCard
            title="If withdrawn today"
            value={<AmountDisplay amount={piggy.netIfWithdrawn.net} {...money} size="lg" />}
            description={
              piggy.yield.taxRegime === "none"
                ? "No tax applied"
                : "After income tax and IOF (estimate)"
            }
          />
          <KpiCard
            title="Earned this month"
            value={
              <AmountDisplay amount={piggy.earnings.month} {...money} kind="income" size="lg" />
            }
            secondary={`${(piggy.annualRate * 100).toFixed(2)}% a year expected`}
          />
          <KpiCard
            title="Earned in total"
            value={
              <AmountDisplay amount={piggy.earnings.allTime} {...money} kind="income" size="lg" />
            }
          />
        </KpiGrid>

        <PiggyBankProjectionChart
          title="Next 12 months"
          description="At your recent monthly deposit and today's expected rate."
          points={piggy.projection}
          currencyCode={currency}
          precision={precision}
          language={language}
        />

        <PanelCard
          title="Movements"
          description="Newest first. Interest is an estimate until you set the real balance."
        >
          <PiggyBankMovements piggyBankId={piggy.id} currencyCode={currency} language={language} />
        </PanelCard>
      </div>

      <PiggyBankSheet open={editOpen} onOpenChange={setEditOpen} piggyBank={piggy} />
      <PiggyBankFundsModal
        open={mode !== null}
        onOpenChange={(open) => !open && setMode(null)}
        piggyBank={piggy}
        siblings={all.data?.piggyBanks ?? []}
        initialMode={mode ?? "deposit"}
      />
    </InternalPageLayout>
  );
}
