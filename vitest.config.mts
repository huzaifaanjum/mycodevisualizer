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
      // Gate pure logic only. React views/hooks are covered by Playwright (`yarn test:e2e`);
      // I/O adapters (Mongo, sandbox, child process, auth, env) need real infrastructure.
      exclude: [
        "**/*.test.*",
        "**/index.ts",
        "src/features/visualizer/components/**",
        "src/features/visualizer/hooks/**",
        "src/server/auth.ts",
        "src/server/context.ts",
        "src/server/env.ts",
        "src/server/db/**",
        "src/server/repositories/**",
        "src/server/execution/**",
        "src/shared/api/client.ts",
      ],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 70 },
    },
  },
});
