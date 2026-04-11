"use client";

import { CreditCardIcon, Wifi01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { cn } from "@/lib/utils";
import { maskCardNumber } from "@/lib/finance";

type CreditCardPreviewProps = {
  brand: string;
  last4: string;
  name: string;
  color?: string | null;
  subtitle?: string;
  balance?: React.ReactNode;
  className?: string;
  detail?: boolean;
};

function getCardPalette(color?: string | null) {
  if (!color) {
    return {
      base: "from-slate-900 via-slate-800 to-slate-700",
      glow: "from-violet-400/22 via-transparent to-blue-300/10",
    };
  }

  const tone = color.toLowerCase();

  if (tone.includes("green")) {
    return { base: "from-emerald-900 via-emerald-700 to-emerald-600", glow: "from-emerald-300/20 via-transparent to-lime-200/10" };
  }
  if (tone.includes("blue") || tone.includes("navy")) {
    return { base: "from-sky-900 via-blue-800 to-indigo-700", glow: "from-violet-200/20 via-transparent to-indigo-200/10" };
  }
  if (tone.includes("red") || tone.includes("wine")) {
    return { base: "from-rose-950 via-rose-800 to-red-700", glow: "from-rose-200/20 via-transparent to-orange-200/10" };
  }
  if (tone.includes("gold") || tone.includes("yellow")) {
    return { base: "from-amber-900 via-amber-700 to-yellow-500", glow: "from-yellow-100/25 via-transparent to-amber-100/10" };
  }
  if (tone.includes("purple")) {
    return { base: "from-violet-950 via-violet-800 to-fuchsia-700", glow: "from-fuchsia-200/20 via-transparent to-violet-200/10" };
  }

  return {
    base: "from-slate-900 via-slate-800 to-slate-700",
    glow: "from-violet-400/22 via-transparent to-blue-300/10",
  };
}

export function CreditCardPreview({
  brand,
  last4,
  name,
  color,
  subtitle,
  balance,
  className,
  detail = false,
}: CreditCardPreviewProps) {
  const palette = getCardPalette(color);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[1.6rem] border border-white/20 bg-linear-to-br p-5 text-white shadow-[0_24px_60px_rgba(15,23,42,0.28)] transition-transform duration-300 hover:-translate-y-0.5",
        palette.base,
        detail ? "min-h-[260px]" : "min-h-[220px]",
        className,
      )}
    >
      <div className={cn("pointer-events-none absolute inset-0 bg-linear-to-br opacity-80", palette.glow)} />
      <div className="pointer-events-none absolute -right-10 top-10 size-40 rounded-full bg-white/10 blur-3xl" />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
              <HugeiconsIcon icon={CreditCardIcon} strokeWidth={2} className="size-6" />
            </div>
            <div className="text-[0.68rem] uppercase tracking-[0.28em] text-white/70">{brand}</div>
          </div>
          <HugeiconsIcon icon={Wifi01Icon} strokeWidth={2} className="size-5 rotate-90 text-white/70" />
        </div>

        <div className="space-y-4">
          <div className="font-mono text-xl tracking-[0.24em] text-white/95">{maskCardNumber(last4)}</div>

          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-[0.62rem] uppercase tracking-[0.28em] text-white/60">Cardholder</div>
              <div className="mt-1 text-sm font-medium uppercase tracking-[0.16em] text-white/95">{name}</div>
              {subtitle ? <div className="mt-2 text-xs text-white/70">{subtitle}</div> : null}
            </div>
            {balance ? (
              <div className="text-right">
                <div className="text-[0.62rem] uppercase tracking-[0.28em] text-white/60">Amount owed</div>
                <div className="mt-1 text-lg font-semibold text-white">{balance}</div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
