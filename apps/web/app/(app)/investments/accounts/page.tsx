"use client";

import { Add01Icon, Delete02Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Portfolio } from "@luraba/contracts";
import type * as React from "react";

import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { AccountCard } from "@/components/investments/account-card";
import { ConfirmDeleteModal } from "@/components/investments/confirm-delete-modal";
import { InvestmentAccountSheet } from "@/components/investments/forms/account-sheet";
import { PortfolioSheet } from "@/components/investments/forms/portfolio-form";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useEntityDisclosure } from "@/hooks/use-disclosure";
import { useDeletePortfolioMutation } from "@/mutations/investments/use-investments-mutations";
import {
  useInvestmentAccountsQuery,
  usePortfoliosQuery,
} from "@/queries/investments/use-investments-queries";

export default function InvestmentAccountsPage() {
  const accounts = useInvestmentAccountsQuery();
  const portfolios = usePortfoliosQuery();
  const accountSheet = useEntityDisclosure<undefined>();
  const portfolioSheet = useEntityDisclosure<Portfolio>();
  const removePortfolio = useEntityDisclosure<Portfolio>();
  const deleteMutation = useDeletePortfolioMutation({
    successToast: { title: "Portfolio deleted" },
    onSuccess: () => removePortfolio.onClose(),
  });

  let content: React.ReactNode;
  if (accounts.isPending) {
    content = (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {["a", "b", "c"].map((key) => (
          <Skeleton key={key} className="h-36 rounded-xl bg-muted/50" />
        ))}
      </div>
    );
  } else if (accounts.isError) {
    content = (
      <ErrorState
        title="Couldn't load your accounts"
        description={accounts.error.message}
        onRetry={() => void accounts.refetch()}
      />
    );
  } else if (accounts.data.length === 0) {
    content = (
      <EmptyState
        title="No investment accounts yet"
        description="Create an account for each broker or bank where you hold investments."
        action={
          <PermissionButton
            permission={PERMISSIONS.INVESTMENTS_WRITE}
            onClick={() => accountSheet.onCreate()}
          >
            Create an account
          </PermissionButton>
        }
      />
    );
  } else {
    content = (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.data.map((account) => (
          <AccountCard key={account.id} account={account} />
        ))}
      </div>
    );
  }

  return (
    <InternalPageLayout
      title="Investment accounts"
      subtitle="Brokerages and banks that hold your investments, with cash in each currency."
      actions={
        <PermissionButton
          permission={PERMISSIONS.INVESTMENTS_WRITE}
          onClick={() => accountSheet.onCreate()}
        >
          <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
          New account
        </PermissionButton>
      }
    >
      {content}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Portfolios</CardTitle>
          <PermissionButton
            permission={PERMISSIONS.INVESTMENTS_WRITE}
            variant="outline"
            size="sm"
            onClick={() => portfolioSheet.onCreate()}
          >
            New portfolio
          </PermissionButton>
        </CardHeader>
        <CardContent>
          {(portfolios.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Portfolios group accounts so you can see, rebalance and compare them together.
            </p>
          ) : (
            <ul className="divide-y">
              {(portfolios.data ?? []).map((portfolio) => (
                <li key={portfolio.id} className="flex items-center justify-between gap-3 py-2">
                  <div>
                    <div className="font-medium">{portfolio.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {portfolio.accountIds.length}{" "}
                      {portfolio.accountIds.length === 1 ? "account" : "accounts"} ·{" "}
                      {portfolio.reportingCurrencyCode}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <PermissionButton
                      permission={PERMISSIONS.INVESTMENTS_WRITE}
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${portfolio.name}`}
                      onClick={() => portfolioSheet.onEdit(portfolio)}
                    >
                      <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                    </PermissionButton>
                    <PermissionButton
                      permission={PERMISSIONS.INVESTMENTS_DELETE}
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${portfolio.name}`}
                      onClick={() => removePortfolio.onEdit(portfolio)}
                    >
                      <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                    </PermissionButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <InvestmentAccountSheet open={accountSheet.isOpen} onOpenChange={accountSheet.setIsOpen} />
      <PortfolioSheet
        open={portfolioSheet.isOpen}
        onOpenChange={portfolioSheet.setIsOpen}
        portfolio={portfolioSheet.entity}
      />
      <ConfirmDeleteModal
        open={removePortfolio.isOpen}
        onOpenChange={removePortfolio.setIsOpen}
        title="Delete portfolio?"
        description="Its accounts and transactions stay; they just leave this grouping."
        confirmLabel="Delete portfolio"
        isLoading={deleteMutation.isPending}
        errorMessage={deleteMutation.errorMessage}
        onConfirm={() => removePortfolio.entity && deleteMutation.mutate(removePortfolio.entity.id)}
      />
    </InternalPageLayout>
  );
}
