import { describe, expect, it } from "vitest";
import { Problems } from "../resolve/problems.js";
import { connectTestClient } from "../testing/connect.js";
import { resolveIcon } from "../tools/icons.js";

describe("resolveIcon", () => {
  it("accepts exact names in any case, with or without the Icon suffix", () => {
    for (const query of [
      "ShoppingBag03Icon",
      "shoppingbag03icon",
      "ShoppingBag03",
      "Shopping bag 03",
    ]) {
      const problems = new Problems();
      expect(resolveIcon(problems, query), query).toBe("ShoppingBag03Icon");
      expect(problems.any).toBe(false);
    }
  });

  it("returns close matches for an unknown icon", () => {
    const problems = new Problems();
    expect(resolveIcon(problems, "grocery")).toBeUndefined();
    expect(problems.items[0]?.candidates.map((c) => c.id)).toContain("ShoppingCart01Icon");
  });
});

describe("icon tools", () => {
  it("lists and searches the supported icons", async () => {
    const { call, close } = await connectTestClient({
      baseUrl: "http://api.test",
      apiKey: "lur_x",
      fetch: async () => new Response("{}"),
    });
    const all = await call("list_icons");
    expect(all.data.count).toBeGreaterThan(40);
    const cars = await call("list_icons", { search: "car" });
    expect(JSON.stringify(cars.data.icons)).toContain("Car01Icon");
    await close();
  });

  it("asks for clarification instead of creating a category with a bad icon", async () => {
    let posted = false;
    const { call, close } = await connectTestClient({
      baseUrl: "http://api.test",
      apiKey: "lur_x",
      fetch: async (_url, init) => {
        if (init.method === "POST") posted = true;
        return new Response("{}");
      },
    });
    const result = await call("create_category", {
      name: "Groceries",
      type: "expense",
      icon: "grocery",
    });
    expect(result.data.status).toBe("needs_clarification");
    expect(posted).toBe(false);
    const both = await call("update_category", {
      category: "x",
      icon: "Car01Icon",
      clearIcon: true,
    });
    expect(both.isError).toBe(true);
    await close();
  });
});
