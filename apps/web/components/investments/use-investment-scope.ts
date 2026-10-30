"use client";

import type { PerformancePeriod } from "@luraba/contracts";
import { PERFORMANCE_PERIODS } from "@luraba/contracts";
import { parseAsBoolean, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";

/** URL-backed filters shared by every investments page: portfolio, account, net-of-tax, period. */
export function useInvestmentScope() {
  const [scope, setScope] = useQueryStates({
    portfolioId: parseAsString,
    accountId: parseAsString,
    net: parseAsBoolean.withDefault(false),
    period: parseAsStringLiteral(PERFORMANCE_PERIODS).withDefault("1Y"),
  });

  return {
    portfolioId: scope.portfolioId ?? undefined,
    accountId: scope.accountId ?? undefined,
    net: scope.net,
    period: scope.period as PerformancePeriod,
    setPortfolioId: (portfolioId: string | null) =>
      setScope({ portfolioId, accountId: portfolioId ? null : scope.accountId }),
    setAccountId: (accountId: string | null) =>
      setScope({ accountId, portfolioId: accountId ? null : scope.portfolioId }),
    setNet: (net: boolean) => setScope({ net }),
    setPeriod: (period: PerformancePeriod) => setScope({ period }),
  };
}

export type InvestmentScope = ReturnType<typeof useInvestmentScope>;

/** The query fragment every scoped endpoint accepts. */
export function scopeQuery(scope: Pick<InvestmentScope, "portfolioId" | "accountId" | "net">) {
  return {
    portfolioId: scope.portfolioId,
    accountId: scope.accountId,
    net: scope.net,
  };
}
