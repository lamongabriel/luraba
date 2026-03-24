import { CreditCardPosIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { cn } from "@/lib/utils"

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <HugeiconsIcon icon={CreditCardPosIcon} size={18} strokeWidth={2} />
      </div>
      <div className={cn("flex min-w-0 flex-col", compact && "hidden")}> 
        <span className="truncate font-heading text-sm leading-none">Luraba</span>
        <span className="truncate text-xs text-muted-foreground">Personal finance</span>
      </div>
    </div>
  )
}
