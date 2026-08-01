import { fileURLToPath } from "node:url"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    clearMocks: true,
    environment: "jsdom",
    restoreMocks: true,
    setupFiles: ["./test/setup.ts"],
  },
})
