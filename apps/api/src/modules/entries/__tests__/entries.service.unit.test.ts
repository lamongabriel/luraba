import { describe, expect, it } from "vitest";
import { ValidationError } from "@/shared/errors";
import { validateBalancedEntries } from "../entries.service";

describe("entries service", () => {
  it("accepts balanced entries per currency", () => {
    expect(() =>
      validateBalancedEntries([
        {
          ledgerAccountId: "ledger-1",
          amount: -10_000,
          currencyCode: "USD",
        },
        {
          ledgerAccountId: "ledger-2",
          amount: 10_000,
          currencyCode: "USD",
        },
        {
          ledgerAccountId: "ledger-3",
          amount: 55_000,
          currencyCode: "BRL",
        },
        {
          ledgerAccountId: "ledger-4",
          amount: -55_000,
          currencyCode: "BRL",
        },
      ]),
    ).not.toThrow();
  });

  it("accepts amounts above the old postgres integer limit", () => {
    expect(() =>
      validateBalancedEntries([
        {
          ledgerAccountId: "ledger-1",
          amount: -2_147_483_648,
          currencyCode: "BRL",
        },
        {
          ledgerAccountId: "ledger-2",
          amount: 2_147_483_648,
          currencyCode: "BRL",
        },
      ]),
    ).not.toThrow();
  });

  it("rejects transactions with fewer than two entries", () => {
    expect(() =>
      validateBalancedEntries([
        {
          ledgerAccountId: "ledger-1",
          amount: 10_000,
          currencyCode: "BRL",
        },
      ]),
    ).toThrow(ValidationError);
  });

  it("rejects unbalanced entries by currency", () => {
    expect(() =>
      validateBalancedEntries([
        {
          ledgerAccountId: "ledger-1",
          amount: -10_000,
          currencyCode: "USD",
        },
        {
          ledgerAccountId: "ledger-2",
          amount: 55_000,
          currencyCode: "BRL",
        },
      ]),
    ).toThrow("Entries are not balanced for currency USD");
  });

  it("rejects zero entry amounts", () => {
    expect(() =>
      validateBalancedEntries([
        {
          ledgerAccountId: "ledger-1",
          amount: 0,
          currencyCode: "BRL",
        },
        {
          ledgerAccountId: "ledger-2",
          amount: 0,
          currencyCode: "BRL",
        },
      ]),
    ).toThrow("Entry amount cannot be zero");
  });

  it("rejects amounts outside the safe integer range", () => {
    expect(() =>
      validateBalancedEntries([
        {
          ledgerAccountId: "ledger-1",
          amount: -9_007_199_254_740_992,
          currencyCode: "BRL",
        },
        {
          ledgerAccountId: "ledger-2",
          amount: 9_007_199_254_740_992,
          currencyCode: "BRL",
        },
      ]),
    ).toThrow("Entry amount must be an integer between");
  });
});
