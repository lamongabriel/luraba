import { Wallet03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex size-9 items-center justify-center rounded-xl bg-primary/12 text-primary">
        <HugeiconsIcon icon={Wallet03Icon} size={18} strokeWidth={2} />
      </div>

      <div className={cn("min-w-0", compact && "hidden")}>
        <Typography as="span" truncate variant="card-title" className="text-base leading-none">
          Luraba
        </Typography>
      </div>
    </div>
  );
}
