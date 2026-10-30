import * as contracts from "@luraba/contracts/investments";
import * as domain from "@luraba/domain";
import { describe, expect, it } from "vitest";

describe("contracts and domain agree on the investment vocabulary", () => {
  it.each([
    ["asset classes", contracts.ASSET_CLASSES, domain.ASSET_CLASSES],
    ["event types", contracts.INVESTMENT_EVENT_TYPES, domain.INVESTMENT_EVENT_TYPES],
    ["cost basis methods", contracts.COST_BASIS_METHODS, domain.COST_BASIS_METHODS],
    ["tax profiles", contracts.TAX_PROFILES, domain.TAX_PROFILES],
    ["indexers", contracts.INDEXERS, domain.INDEXERS],
    ["rate forms", contracts.RATE_FORMS, domain.RATE_FORMS],
    ["day counts", contracts.DAY_COUNTS, domain.DAY_COUNTS],
    ["performance periods", contracts.PERFORMANCE_PERIODS, domain.PERFORMANCE_PERIODS],
  ])("%s", (_name, fromContracts, fromDomain) => {
    expect([...fromContracts].sort()).toEqual([...fromDomain].sort());
  });
});
