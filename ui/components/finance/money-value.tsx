import { cn } from "@/lib/utils";
import { formatCurrency, formatSignedCurrency } from "@/lib/finance";
import { typographyVariants } from "@/components/ui/typography";

export function MoneyValue({
  amount,
  currencyCode,
  signed = false,
  language = "en",
  className,
}: {
  amount: number;
  currencyCode: string;
  signed?: boolean;
  language?: string;
  className?: string;
}) {
  return (
    <span className={cn(typographyVariants({ variant: "mono" }), className)}>
      {signed ? formatSignedCurrency(amount, currencyCode, language) : formatCurrency(amount, currencyCode, language)}
    </span>
  );
}
