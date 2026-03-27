import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatMonthLabel, shiftMonthKey } from "@/lib/finance";

export function MonthSwitcher({
  month,
  onChange,
}: {
  month: string;
  onChange: (month: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon-sm" onClick={() => onChange(shiftMonthKey(month, -1))}>
        <ChevronLeft className="size-4" />
        <span className="sr-only">Previous month</span>
      </Button>
      <div className="min-w-40 rounded-full border border-border/70 bg-[var(--color-container-inset)] px-4 py-2 text-center text-sm font-medium">
        {formatMonthLabel(month)}
      </div>
      <Button variant="outline" size="icon-sm" onClick={() => onChange(shiftMonthKey(month, 1))}>
        <ChevronRight className="size-4" />
        <span className="sr-only">Next month</span>
      </Button>
    </div>
  );
}
