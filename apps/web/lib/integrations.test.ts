import { INTEGRATION_PROVIDER_IDS, INTEGRATION_STATUS_VALUES } from "@luraba/contracts";
import { describe, expect, it } from "vitest";
import {
  INTEGRATION_PROVIDER_INFO,
  INTEGRATION_STATUS_BADGE_CLASSES,
  INTEGRATION_STATUS_LABELS,
} from "./integrations";

describe("integration display catalog", () => {
  it("describes every provider and status the API can return", () => {
    for (const provider of INTEGRATION_PROVIDER_IDS) {
      expect(INTEGRATION_PROVIDER_INFO[provider].summary.length).toBeGreaterThan(10);
    }
    for (const status of INTEGRATION_STATUS_VALUES) {
      expect(INTEGRATION_STATUS_LABELS[status]).toBeTruthy();
      expect(INTEGRATION_STATUS_BADGE_CLASSES[status]).toBeDefined();
    }
  });
});
