import { fileURLToPath } from "node:url";
import path from "node:path";

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// tsconfig.json "@/*" -> "./src/*" eşlemesini Vite/Vitest okumadığı için
// burada açıkça tanımlıyoruz (bkz. tsconfig.json paths).
const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "./src");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": srcDir,
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
