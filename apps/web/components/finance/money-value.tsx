import { typographyVariants } from "@/components/ui/typography";
import { formatCurrency, formatSignedCurrency } from "@/lib/finance";
import { cn } from "@/lib/utils";

export function MoneyValue({
  amount,
  currencyCode,
  signed = false,
  language = "en",
  precision = 2,
  className,
}: {
  amount: number;
  currencyCode: string;
  signed?: boolean;
  language?: string;
  precision?: number;
  className?: string;
}) {
  return (
    <span className={cn(typographyVariants({ variant: "mono" }), className)}>
      {signed
        ? formatSignedCurrency(amount, currencyCode, language, precision)
        : formatCurrency(amount, currencyCode, language, undefined, precision)}
    </span>
  );
}
