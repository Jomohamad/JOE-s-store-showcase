import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.tsx"],
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["node_modules/"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "vitest.setup.ts", "**/*.d.ts", "**/*.config.*"],
    },
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    globals: true,
  },
});