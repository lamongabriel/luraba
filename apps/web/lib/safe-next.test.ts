import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-next";

const API = "https://luraba.example.com";

describe("safeNext", () => {
  it("accepts app paths and the OAuth authorize URL of this deployment", () => {
    expect(safeNext("/oauth/consent?consent_code=abc", API)).toBe(
      "/oauth/consent?consent_code=abc",
    );
    const authorize = `${API}/api/auth/mcp/authorize?client_id=x`;
    expect(safeNext(authorize, API)).toBe(authorize);
  });

  it("rejects everything else", () => {
    expect(safeNext(null, API)).toBeNull();
    expect(safeNext("//evil.com", API)).toBeNull();
    expect(safeNext("/\\evil.com", API)).toBeNull();
    expect(safeNext("https://evil.com/api/auth/mcp/authorize", API)).toBeNull();
    expect(safeNext(`${API}/api/v1/accounts`, API)).toBeNull();
    expect(safeNext("javascript:alert(1)", API)).toBeNull();
  });
});
