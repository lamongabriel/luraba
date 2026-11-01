import { describe, expect, it } from "vitest";
import { ConfigError, loadConfig } from "../config.js";

describe("loadConfig", () => {
  it("requires a Luraba key for stdio and never echoes it back", () => {
    expect(() => loadConfig({})).toThrow(ConfigError);
    try {
      loadConfig({ LURABA_API_KEY: "sk-secret-value" });
    } catch (error) {
      expect(String(error)).toContain("LURABA_API_KEY");
      expect(String(error)).not.toContain("sk-secret-value");
    }
  });

  it("applies defaults and treats blank values as unset", () => {
    const config = loadConfig({ LURABA_API_KEY: "lur_abc", LURABA_HOUSEHOLD_ID: "" });
    expect(config).toMatchObject({
      LURABA_API_URL: "http://127.0.0.1:3001",
      MCP_TRANSPORT: "stdio",
      MCP_HTTP_PORT: 3333,
    });
    expect(config.LURABA_HOUSEHOLD_ID).toBeUndefined();
  });

  it("lets the http transport run without a fallback key", () => {
    expect(loadConfig({ MCP_TRANSPORT: "http" }).LURABA_API_KEY).toBeUndefined();
  });
});
