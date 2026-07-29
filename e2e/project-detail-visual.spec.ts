import { test, expect } from "@playwright/test";

// Proje Detay ekranı görsel testi (Task 12). mock-backend.ts'teki p-1 (Kule A)
// projesine bağlı iki şantiyeyi (A-Blok aktif, B-Blok tamamlandı) kullanır —
// SiteCard'ın hem aktif hem tamamlanmış varyantını tek ekranda gösterir.
test("proje detay ekrani gorsel", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();

  await page.goto("/projeler/p-1");
  await expect(page.getByRole("heading", { level: 1, name: "Kule A" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "A-Blok Şantiyesi", level: 3 })).toBeVisible();
  await expect(page).toHaveScreenshot("proje-detay.png", { fullPage: true });
});
