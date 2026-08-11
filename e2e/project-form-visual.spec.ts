import { test, expect } from "@playwright/test";

import { prepareFrame } from "./visual-scroll";

// P1.1a F14 — /projeler/yeni gorsel spec (1440px, taahhut varyanti — varsayilan
// secim, bkz. src/components/project-form/form-state.ts emptyProjectFormValues).
// Baseline SADECE Linux CI'da uretilir (visual-baselines.yml, workflow_dispatch);
// macOS'ta bu dosya calistirilmaz, .png commit edilmez.
test("yeni proje formu gorsel (taahhut varyanti)", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();

  await page.goto("/projeler/yeni");
  await expect(page.getByRole("heading", { name: "Yeni Proje Oluştur" })).toBeVisible();
  // Taahhüt varyantına özgü İşveren kartının yüklenmesini bekle (GET /employers).
  await expect(page.getByLabel("İşveren Firma")).toBeVisible();

  // Kadraj hazırlığı (kaydırma sıfırlama + imleç parkı): `visual-scroll.ts`.
  await prepareFrame(page);
  await expect(page).toHaveScreenshot("project-form-new.png", { fullPage: true });
});
