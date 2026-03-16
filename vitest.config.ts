import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/app/index.ts", "src/db/migrate.ts"],
    },
    // Use an in-memory DB for integration tests
    env: {
      DATABASE_URL: ":memory:",
      NODE_ENV: "test",
    },
  },
});
