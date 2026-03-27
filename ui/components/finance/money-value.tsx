"use client";

import { useAuthStore } from "@/stores/auth.store";
import { cn } from "@/lib/utils";
import { formatCurrency, formatSignedCurrency } from "@/lib/finance";

export function MoneyValue({
  amount,
  currencyCode,
  signed = false,
  className,
}: {
  amount: number;
  currencyCode: string;
  signed?: boolean;
  className?: string;
}) {
  const language = useAuthStore((state) => state.user?.preferences.language ?? "en");

  return (
    <span className={cn("font-medium tabular-nums", className)}>
      {signed ? formatSignedCurrency(amount, currencyCode, language) : formatCurrency(amount, currencyCode, language)}
    </span>
  );
}
