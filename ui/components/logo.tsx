import { CreditCardPosIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { cn } from "@/lib/utils"

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex size-10 items-center justify-center rounded-2xl bg-linear-to-br from-primary/20 via-primary/10 to-white text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
        <HugeiconsIcon icon={CreditCardPosIcon} size={18} strokeWidth={2} />
      </div>
      <div className={cn("flex min-w-0 flex-col", compact && "hidden")}>
        <span className="truncate font-heading text-base leading-none text-foreground">Luraba</span>
        <span className="truncate text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
          Money workspace
        </span>
      </div>
    </div>
  )
}
