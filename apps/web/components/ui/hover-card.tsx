"use client";

import { HoverCard as HoverCardPrimitive } from "radix-ui";
import type * as React from "react";

import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/** A hover card never opens on a phone: there is no hover. */
function HoverCard(props: React.ComponentProps<typeof HoverCardPrimitive.Root>) {
  const isMobile = useIsMobile();
  return <HoverCardPrimitive.Root {...props} {...(isMobile ? { open: false } : {})} />;
}

function HoverCardTrigger(props: React.ComponentProps<typeof HoverCardPrimitive.Trigger>) {
  return <HoverCardPrimitive.Trigger {...props} />;
}

function HoverCardContent({
  align = "center",
  className,
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Content>) {
  return (
    <HoverCardPrimitive.Portal>
      <HoverCardPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-80 rounded-xl border border-border bg-popover p-4 text-popover-foreground outline-none",
          className,
        )}
        {...props}
      />
    </HoverCardPrimitive.Portal>
  );
}

export { HoverCard, HoverCardContent, HoverCardTrigger };
