import { accountsEndpoints } from "@luraba/contracts";
import { describe, expect, it, vi } from "vitest";
import { LurabaApiError } from "../client/errors.js";
import { LurabaClient } from "../client/luraba-client.js";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("LurabaClient", () => {
  it("sends the key and household and maps API failures", async () => {
    const fetch = vi.fn(async () =>
      json({ success: false, error: { code: "FORBIDDEN", message: "No access" } }, 403),
    );
    const client = new LurabaClient({
      baseUrl: "http://api.test/",
      apiKey: "lur_secret",
      householdId: "h-1",
      fetch,
    });
    await expect(client.request(accountsEndpoints.list, { query: {} })).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url.startsWith("http://api.test/api/v1/accounts")).toBe(true);
    expect(init.headers).toMatchObject({
      Authorization: "Bearer lur_secret",
      "X-Household-Id": "h-1",
    });
  });

  it("reports an unreachable API without leaking the key", async () => {
    const fetch = vi.fn(async () => {
      throw new Error("connect ECONNREFUSED lur_secret");
    });
    const client = new LurabaClient({ baseUrl: "http://api.test", apiKey: "lur_secret", fetch });
    const error = await client.request(accountsEndpoints.list, { query: {} }).catch((e) => e);
    expect(error).toBeInstanceOf(LurabaApiError);
    expect(error.status).toBe(503);
    expect(error.message).not.toContain("lur_secret");
  });
});
