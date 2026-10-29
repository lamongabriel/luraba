import { NOTIFICATION_EVENTS } from "@luraba/contracts";
import { describe, expect, it } from "vitest";
import {
  buildPreferenceLookup,
  buildPreferenceMatrix,
  isChannelEnabled,
  resolveEnabledChannels,
} from "./preferences.js";

describe("notification preferences", () => {
  it("falls back to the catalog defaults without overrides", () => {
    const lookup = buildPreferenceLookup([]);

    expect(resolveEnabledChannels(lookup, "transaction.created")).toEqual(["in_app"]);
    expect(isChannelEnabled(lookup, "transaction.created", "email")).toBe(false);
  });

  it("lets an explicit override beat the default in both directions", () => {
    const lookup = buildPreferenceLookup([
      { userId: "u", eventType: "transaction.created", channel: "email", enabled: true },
      { userId: "u", eventType: "transaction.created", channel: "in_app", enabled: false },
    ]);

    expect(resolveEnabledChannels(lookup, "transaction.created")).toEqual(["email"]);
  });

  it("scopes an override to its own event", () => {
    const lookup = buildPreferenceLookup([
      { userId: "u", eventType: "transaction.created", channel: "sms", enabled: true },
    ]);

    expect(isChannelEnabled(lookup, "system.test", "sms")).toBe(
      NOTIFICATION_EVENTS["system.test"].defaults.sms,
    );
  });

  it("builds a matrix with every event and channel filled in", () => {
    const matrix = buildPreferenceMatrix(buildPreferenceLookup([]));

    expect(matrix.map((row) => row.eventType)).toEqual(Object.keys(NOTIFICATION_EVENTS));
    for (const row of matrix) {
      expect(Object.keys(row.channels).sort()).toEqual(["email", "in_app", "push", "sms"]);
    }
  });
});
