import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "jsdom", setupFiles: ["./test/setup.ts"] },
  esbuild: { jsx: "automatic" },
});
