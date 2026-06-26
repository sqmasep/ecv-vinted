import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["{lib,components,app}/**/*.{test,spec}.{ts,tsx}"],
    server: {
      // Inline the workspace UI package so its JSX is transformed in tests.
      deps: { inline: [/@repo\/ui/] },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
