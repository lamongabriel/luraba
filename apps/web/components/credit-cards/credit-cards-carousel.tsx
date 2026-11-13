"use client";

import type { CreditCardOverviewCard } from "@luraba/contracts";
import * as React from "react";
import {
  CARD_TILE_HEIGHT_CLASS,
  CARD_TILE_WIDTH_CLASS,
  CreditCardTile,
} from "@/components/credit-cards/credit-card-tile";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const TRACK_CLASS =
  "flex gap-4 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
/** The dots row below the track (phone only); reserved even with one card so the skeleton matches. */
const DOTS_ROW_CLASS = "flex h-4 items-center justify-center gap-1.5 md:hidden";

/** Mouse drag-to-scroll (touch and trackpads already scroll natively). A drag never counts as a tap. */
function useDragScroll(ref: React.RefObject<HTMLUListElement | null>) {
  const state = React.useRef<{ x: number; left: number; moved: boolean } | null>(null);

  return {
    onPointerDown: (event: React.PointerEvent<HTMLUListElement>) => {
      if (event.pointerType !== "mouse" || event.button !== 0 || !ref.current) return;
      state.current = { x: event.clientX, left: ref.current.scrollLeft, moved: false };
    },
    onPointerMove: (event: React.PointerEvent<HTMLUListElement>) => {
      const drag = state.current;
      const node = ref.current;
      if (!drag || !node) return;
      const dx = event.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) < 6) return;
      drag.moved = true;
      node.style.scrollSnapType = "none";
      node.scrollLeft = drag.left - dx;
    },
    onPointerUp: () => {
      const node = ref.current;
      if (node) node.style.scrollSnapType = "";
      // Keep `moved` until the click that follows the release has been swallowed.
      window.setTimeout(() => {
        state.current = null;
      }, 0);
    },
    onClickCapture: (event: React.MouseEvent<HTMLUListElement>) => {
      if (state.current?.moved) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
  };
}

/**
 * The household's cards as a carousel, right under the page title. Desktop: a row of large tiles that
 * scrolls (wheel, trackpad, touch) or drags with the mouse, snapping to a tile. Phone: one card per screen,
 * swipeable, with page dots. Nothing sits under the tiles; everything lives inside them.
 */
export function CreditCardsCarousel({
  cards,
  language,
  precisionOf,
}: {
  cards: CreditCardOverviewCard[];
  language: string;
  precisionOf: (currencyCode: string) => number;
}) {
  const trackRef = React.useRef<HTMLUListElement>(null);
  const [active, setActive] = React.useState(0);
  const drag = useDragScroll(trackRef);

  const onScroll = () => {
    const node = trackRef.current;
    if (!node || node.clientWidth === 0) return;
    const first = node.firstElementChild as HTMLElement | null;
    const step = first ? first.offsetWidth + 16 : node.clientWidth;
    setActive(Math.min(cards.length - 1, Math.max(0, Math.round(node.scrollLeft / step))));
  };
  const goTo = (index: number) => {
    const node = trackRef.current;
    const target = node?.children[index] as HTMLElement | undefined;
    target?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  };

  return (
    <section aria-label="Credit cards" className="min-w-0 space-y-2">
      <ul
        ref={trackRef}
        onScroll={onScroll}
        {...drag}
        className={cn(
          TRACK_CLASS,
          "snap-x snap-mandatory md:cursor-grab md:active:cursor-grabbing",
        )}
      >
        {cards.map((card) => (
          <li key={card.creditCardId} className="shrink-0 snap-start max-md:w-full">
            <CreditCardTile
              card={card}
              language={language}
              precision={precisionOf(card.currencyCode)}
            />
          </li>
        ))}
      </ul>
      <div className={DOTS_ROW_CLASS}>
        {cards.length > 1
          ? cards.map((card, index) => (
              <button
                key={card.creditCardId}
                type="button"
                aria-label={`Show ${card.name}`}
                aria-current={index === active}
                onClick={() => goTo(index)}
                className={cn(
                  "size-1.5 rounded-full transition-colors",
                  index === active ? "bg-foreground" : "bg-muted-foreground/40",
                )}
              />
            ))
          : null}
      </div>
    </section>
  );
}

/** Loading twin of `CreditCardsCarousel`: the same track, tile size and dots row. */
export function CreditCardsCarouselSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading credit cards"
      className="min-w-0 space-y-2"
    >
      <div className={TRACK_CLASS}>
        {[0, 1, 2].map((key) => (
          <div key={key} className={cn("shrink-0 max-md:w-full", key > 0 && "max-md:hidden")}>
            <Skeleton
              className={cn("rounded-2xl", CARD_TILE_HEIGHT_CLASS, CARD_TILE_WIDTH_CLASS)}
            />
          </div>
        ))}
      </div>
      <div className={DOTS_ROW_CLASS} />
    </div>
  );
}
