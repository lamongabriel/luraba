import type { CreditCard } from "@luraba/contracts";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CreditCardDetailsPanel } from "../credit-card-details-panel";

const card = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Inter",
  currencyCode: "BRL",
  closingDay: 28,
  dueDay: 5,
  brand: "Visa",
  last4: "1234",
  color: null,
  institutionName: null,
  institutionLogoUrl: null,
  ownerAccount: {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Checking",
    institutionName: null,
    institutionLogoUrl: null,
    type: "cash",
    classification: "asset",
    currencyCode: "BRL",
  },
} as unknown as CreditCard;

describe("CreditCardDetailsPanel credit balance", () => {
  it("shows the card credit balance next to the card details", () => {
    render(<CreditCardDetailsPanel card={card} creditBalance={4} />);
    expect(screen.getByText("Credit balance")).toBeTruthy();
    expect(screen.getByText(/0[.,]04/)).toBeTruthy();
  });

  it("keeps the row (as a skeleton) while the overview is loading", () => {
    render(<CreditCardDetailsPanel card={card} />);
    expect(screen.getByText("Credit balance")).toBeTruthy();
  });
});
