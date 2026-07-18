import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/neikirk/",
  plugins: [react()],
  build: {
    target: "es2019",
    assetsInlineLimit: 0,
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
