import { fileURLToPath } from "node:url";
import path from "node:path";

import { defineConfig, configDefaults } from "vitest/config";
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
    // Varsayilan 5 sn, 168 dosyalik paket paralel kosarken agir form gonderim
    // testlerinde (ProjectCreateView/SiteCreateView/FacilitiesCard) asiliyordu:
    // ayni dosyalar izole kosuda geciyor, tam kosuda her seferinde BASKA dosya
    // zaman asimina ugruyordu. Assert'leri zayiflatmadan tampon acilir (F-P6).
    testTimeout: 15000,
    // e2e/ Playwright'a ait; Vitest'in bu dosyalari test olarak toplamasini engelle
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
