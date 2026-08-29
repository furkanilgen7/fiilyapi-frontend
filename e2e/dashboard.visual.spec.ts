import { test, expect } from "@playwright/test";

import { prepareFrame } from "./visual-scroll";

test("gosterge paneli gorsel", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();

  // 🔴 RISK-1 — kare alinmadan ONCE risk kartinin UC SATIRI DA basilmis
  // olmalidir. Bu capalar olmadan baseline kartin YUKLENME halini dondurabilir
  // ve kart bir gun tamamen kaybolsa bile kare "ayni" kalirdi (kadraj
  // determinizmi kanonu). Ayrica bu satirlar canli cokusun aynasidir: kart
  // nesneyi React cocugu olarak basarsa sayfa hic acilmaz.
  await expect(page.getByText("Stok kritik seviyede")).toBeVisible();
  await expect(page.getByText("Hakediş gecikmiş")).toBeVisible();
  await expect(page.getByText("Hedef aşıldı")).toBeVisible();

  // Kadraj hazırlığı (kaydırma sıfırlama + imleç parkı): `visual-scroll.ts`.
  await prepareFrame(page);
  await expect(page).toHaveScreenshot("dashboard.png", { fullPage: true });
});
