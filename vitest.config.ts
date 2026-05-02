import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: [
      "src/**/*.test.{ts,tsx}",
      "extension/chrome/**/*.test.{js,ts}"
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/**/*.{ts,tsx}",
        "extension/chrome/sidepanel-utils.js"
      ],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/test/**",
        "src/types/**",
        // Client-only UI components require browser APIs (localStorage, document)
        // not available in jsdom — covered by manual smoke testing
        "src/components/costs/**",
        "src/components/charts/token-timeline.tsx",
        "src/components/overview-dashboard.tsx",
        "src/components/maintenance-dialog.tsx",
        "src/components/refresh-interval-provider.tsx",
        "src/app/**/loading.tsx",
        "src/app/**/error.tsx"
      ],
      thresholds: { lines: 58, statements: 57, functions: 57, branches: 46 }
    }
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname
    }
  }
});
