"use client";

import { useAuthStore } from "@/stores/auth.store";
import { cn } from "@/lib/utils";
import { formatCurrency, formatSignedCurrency } from "@/lib/finance";
import { typographyVariants } from "@/components/ui/typography";

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
    <span className={cn(typographyVariants({ variant: "mono" }), className)}>
      {signed ? formatSignedCurrency(amount, currencyCode, language) : formatCurrency(amount, currencyCode, language)}
    </span>
  );
}
