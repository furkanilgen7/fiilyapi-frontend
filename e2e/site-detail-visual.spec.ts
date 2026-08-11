import { test, expect } from "@playwright/test";

import { prepareFrame } from "./visual-scroll";

// Şantiye Detay ekranı görsel testi (Task 12). mock-backend.ts'teki s-1
// (A-Blok Şantiyesi) iki bölümle gelir — biri aktif (mavi ilerleme şeması),
// biri tamamlandı (yeşil) — SectionCard'ın durum bazlı varyantlarını kapsar.
test("santiye detay ekrani gorsel", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();

  await page.goto("/projeler/p-1/santiyeler/s-1");
  await expect(page.getByRole("heading", { level: 1, name: "A-Blok Şantiyesi" })).toBeVisible();
  await expect(page.getByText("Kat 6–10 Kaba İnşaat")).toBeVisible();

  // Kadraj hazırlığı (kaydırma sıfırlama + imleç parkı): `visual-scroll.ts`.
  await prepareFrame(page);
  await expect(page).toHaveScreenshot("santiye-detay.png", { fullPage: true });
});
