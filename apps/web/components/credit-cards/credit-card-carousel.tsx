"use client";

import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { CreditCard } from "@luraba/contracts";
import { CreditCardPreview } from "@/components/credit-cards/credit-card-preview";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";

export function CreditCardCarousel({
  cards,
  selectedCardId,
  onSelect,
}: {
  cards: CreditCard[];
  selectedCardId: string;
  onSelect: (cardId: string) => void;
}) {
  const selectedIndex = Math.max(
    0,
    cards.findIndex((card) => card.id === selectedCardId),
  );
  const selectedCard = cards[selectedIndex];

  if (!selectedCard) return null;

  const previousCard = cards[selectedIndex - 1];
  const nextCard = cards[selectedIndex + 1];

  return (
    <div className="space-y-3">
      <div className="relative mx-auto flex min-h-52 max-w-3xl items-center justify-center px-10 sm:px-16">
        {previousCard ? (
          <div className="absolute left-0 hidden w-48 opacity-45 transition-opacity hover:opacity-75 sm:block">
            <CreditCardPreview
              brand={previousCard.brand}
              color={previousCard.color ?? undefined}
              institutionName={previousCard.institutionName ?? undefined}
              last4={previousCard.last4}
              name={previousCard.name}
              onClick={() => onSelect(previousCard.id)}
              className="border-0 bg-transparent p-0"
            />
          </div>
        ) : null}

        <CreditCardPreview
          brand={selectedCard.brand}
          color={selectedCard.color ?? undefined}
          institutionName={selectedCard.institutionName ?? undefined}
          last4={selectedCard.last4}
          name={selectedCard.name}
          onClick={() => onSelect(selectedCard.id)}
          selected
          className="border-0 bg-transparent p-0"
        />

        {nextCard ? (
          <div className="absolute right-0 hidden w-48 opacity-45 transition-opacity hover:opacity-75 sm:block">
            <CreditCardPreview
              brand={nextCard.brand}
              color={nextCard.color ?? undefined}
              institutionName={nextCard.institutionName ?? undefined}
              last4={nextCard.last4}
              name={nextCard.name}
              onClick={() => onSelect(nextCard.id)}
              className="border-0 bg-transparent p-0"
            />
          </div>
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Previous credit card"
          disabled={!previousCard}
          className="absolute left-0 top-1/2 -translate-y-1/2"
          onClick={() => previousCard && onSelect(previousCard.id)}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Next credit card"
          disabled={!nextCard}
          className="absolute right-0 top-1/2 -translate-y-1/2"
          onClick={() => nextCard && onSelect(nextCard.id)}
        >
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
        </Button>
      </div>

      <div className="text-center">
        <Typography variant="small-strong">{selectedCard.name}</Typography>
        <Typography variant="small-muted">
          {selectedCard.brand} · {selectedCard.ownerAccount.name} · {selectedCard.currencyCode}
        </Typography>
      </div>

      <fieldset
        className="flex justify-center gap-1.5 border-0 p-0"
        aria-label="Credit card selection"
      >
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            aria-label={`Select ${card.name}`}
            aria-current={card.id === selectedCard.id}
            className="h-1.5 rounded-full bg-muted transition-[width,background-color] aria-current:w-5 aria-current:bg-primary w-1.5"
            onClick={() => onSelect(card.id)}
          />
        ))}
      </fieldset>
    </div>
  );
}
