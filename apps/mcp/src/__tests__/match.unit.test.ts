import { describe, expect, it } from "vitest";
import { resolveByName } from "../resolve/match.js";

const accounts = [
  { id: "11111111-1111-4111-8111-111111111111", name: "Chase Checking" },
  { id: "22222222-2222-4222-8222-222222222222", name: "Chase Savings" },
  { id: "33333333-3333-4333-8333-333333333333", name: "Ally" },
];

describe("resolveByName", () => {
  it("resolves ids, exact names (case and accent insensitive) and unique partial names", () => {
    expect(resolveByName(accounts[0]!.id, accounts)).toMatchObject({
      status: "resolved",
      match: "id",
    });
    expect(resolveByName("CHASE checking", accounts)).toMatchObject({
      status: "resolved",
      match: "exact",
    });
    expect(resolveByName("ally", accounts)).toMatchObject({
      status: "resolved",
      id: accounts[2]!.id,
    });
  });

  it("returns candidates instead of guessing when several match", () => {
    const result = resolveByName("chase", accounts);
    expect(result.status).toBe("ambiguous");
    if (result.status === "ambiguous") expect(result.candidates).toHaveLength(2);
  });

  it("reports unknown names", () => {
    expect(resolveByName("Wells Fargo", accounts).status).toBe("not_found");
  });
});
