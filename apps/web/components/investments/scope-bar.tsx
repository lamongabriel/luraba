"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  useInvestmentAccountsQuery,
  usePortfoliosQuery,
} from "@/queries/investments/use-investments-queries";

import type { InvestmentScope } from "./use-investment-scope";

const ALL = "__all__";

/** Portfolio / account picker and the net-of-tax switch shared by the investment pages. */
export function ScopeBar({ scope, showNet = true }: { scope: InvestmentScope; showNet?: boolean }) {
  const portfolios = usePortfoliosQuery();
  const accounts = useInvestmentAccountsQuery();
  const value = scope.accountId
    ? `account:${scope.accountId}`
    : scope.portfolioId
      ? `portfolio:${scope.portfolioId}`
      : ALL;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={value}
        onValueChange={(next) => {
          if (next === ALL) {
            scope.setPortfolioId(null);
            scope.setAccountId(null);
          } else if (next.startsWith("portfolio:")) {
            scope.setPortfolioId(next.slice("portfolio:".length));
          } else {
            scope.setAccountId(next.slice("account:".length));
          }
        }}
      >
        <SelectTrigger className="w-56" aria-label="Portfolio or account">
          <SelectValue placeholder="All accounts" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All accounts</SelectItem>
          {(portfolios.data ?? []).map((portfolio) => (
            <SelectItem key={portfolio.id} value={`portfolio:${portfolio.id}`}>
              Portfolio: {portfolio.name}
            </SelectItem>
          ))}
          {(accounts.data ?? []).map((account) => (
            <SelectItem key={account.id} value={`account:${account.id}`}>
              {account.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showNet ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch
            id="investments-net"
            checked={scope.net}
            onCheckedChange={scope.setNet}
            aria-labelledby="investments-net-label"
          />
          <span id="investments-net-label">Net of estimated taxes</span>
        </div>
      ) : null}
    </div>
  );
}
