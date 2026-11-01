import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const appRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(appRoot, "src"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    fileParallelism: false,
    // The MCP proxy test starts the MCP server here (see modules/mcp/__tests__).
    env: { MCP_INTERNAL_URL: "http://127.0.0.1:3499" },
    include: ["src/**/*.{test,spec}.ts"],
    exclude: ["**/*.unit.test.ts"],
    globalSetup: ["src/test/global-setup.ts"],
    setupFiles: ["src/test/setup.ts"],
  },
});
