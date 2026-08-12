import { test, expect } from "@playwright/test";

import { prepareFrame } from "./visual-scroll";

test("kabuk ana sayfa gorsel", async ({ page }) => {
  // F-ST T1 (onaylı görsel borç) — kadraj penceresi AÇIKÇA kurulur; bkz.
  // `login-visual.spec.ts` notu (config varsayılanı 1280×900, kanon 1440×900).
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  // Kabuk oturmasi icin kullanici adi + karsilama gorunur olmali
  await expect(page.getByText("Ahmet Yılmaz", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();

  // Kadraj hazırlığı (kaydırma sıfırlama + imleç parkı): `visual-scroll.ts`.
  await prepareFrame(page);
  await expect(page).toHaveScreenshot("shell-home.png", { fullPage: true });
});
