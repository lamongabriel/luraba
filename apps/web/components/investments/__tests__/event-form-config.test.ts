import { INVESTMENT_EVENT_TYPES } from "@luraba/contracts";
import { describe, expect, it } from "vitest";
import { eventFormSchema } from "../forms/event-form.schema";
import { EVENT_FIELDS, EVENT_TYPE_GROUPS } from "../forms/event-form-config";
import { toEventBody } from "../forms/use-event-form";

const base = {
  accountId: "acc",
  type: "BUY",
  assetId: "",
  targetAssetId: "",
  tradeDate: "2026-03-02",
  quantity: "",
  unitPrice: "",
  grossAmount: "",
  fees: "",
  taxesWithheld: "",
  ratioFrom: "",
  ratioTo: "",
  exchangeRatio: "",
  costRatio: "",
  notes: "",
} as const;

describe("event form config", () => {
  it("offers every type except the ones handled by cash movements", () => {
    const offered = new Set(EVENT_TYPE_GROUPS.flatMap((group) => group.types));
    const cashMovementOnly = new Set(["TRANSFER_IN", "TRANSFER_OUT", "FX_CONVERSION"]);
    for (const type of INVESTMENT_EVENT_TYPES) {
      if (cashMovementOnly.has(type)) expect(offered.has(type)).toBe(false);
      else {
        expect(offered.has(type)).toBe(true);
        expect(EVENT_FIELDS[type]).toBeDefined();
      }
    }
  });

  it("requires what each type needs", () => {
    const buy = eventFormSchema.safeParse({ ...base });
    expect(buy.success).toBe(false);
    const filled = eventFormSchema.safeParse({
      ...base,
      assetId: "asset",
      quantity: "10",
      unitPrice: "150.25",
    });
    expect(filled.success).toBe(true);
    const split = eventFormSchema.safeParse({ ...base, type: "SPLIT", assetId: "asset" });
    expect(split.success).toBe(false);
    const deposit = eventFormSchema.safeParse({ ...base, type: "DEPOSIT", grossAmount: "100" });
    expect(deposit.success).toBe(true);
  });

  it("builds a body without the fields a type does not use", () => {
    const body = toEventBody({
      ...base,
      type: "SPLIT",
      assetId: "asset",
      ratioFrom: "1",
      ratioTo: "4",
      quantity: "99",
    });
    expect(body.quantity).toBeUndefined();
    expect(body.meta).toEqual({ ratioFrom: "1", ratioTo: "4" });

    const buy = toEventBody({
      ...base,
      assetId: "asset",
      quantity: "0.12345678",
      unitPrice: "150.25",
      fees: "1",
    });
    expect(buy).toMatchObject({ quantity: "0.12345678", unitPrice: "150.25", fees: "1" });
    expect(buy.grossAmount).toBeUndefined();

    const cash = toEventBody({ ...base, type: "DEPOSIT", grossAmount: "1000", assetId: "stale" });
    expect(cash.assetId).toBeNull();
  });
});
