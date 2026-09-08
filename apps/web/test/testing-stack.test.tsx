import { render, screen } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { expect, test } from "vitest";

import { server } from "./msw/server";

test("renders data returned by MSW", async () => {
  server.use(
    http.get("https://api.luraba.test/health", () => {
      return HttpResponse.json({ status: "ok" });
    }),
  );

  const response = await fetch("https://api.luraba.test/health");
  const data = (await response.json()) as { status: string };

  render(<p role="status">API status: {data.status}</p>);

  expect(screen.getByRole("status")).toHaveTextContent("API status: ok");
});
