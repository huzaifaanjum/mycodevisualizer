import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@/": fileURLToPath(new URL("./src/", import.meta.url)),
      "@content/": fileURLToPath(new URL("./content/", import.meta.url)),
      "@tests/": fileURLToPath(new URL("./tests/", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/features/visualizer/**", "src/server/**", "src/shared/**", "src/languages/**"],
      exclude: ["**/*.test.*", "**/index.ts"],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 70 },
    },
  },
});
