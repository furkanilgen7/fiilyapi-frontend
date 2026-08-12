import { test, expect } from "@playwright/test";

import { prepareFrame } from "./visual-scroll";

test("giris ekrani gorsel", async ({ page }) => {
  // F-ST T1 (onaylı görsel borç) — kadraj penceresi AÇIKÇA kurulur. Bu dosya
  // eskiden `playwright.config.ts`in 1280×900 varsayılanına düşüyordu; diğer
  // tüm görsel spec'ler 1440×900 kullanıyor. Tek pencere = kırpma/sarma
  // farklarının baseline'lar arasında karşılaştırılabilir kalması.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  // Font/animasyon oturmasi icin marka basligini bekle.
  await expect(page.getByText(/tek platformda yönetin/i)).toBeVisible();

  // Kadraj hazırlığı (kaydırma sıfırlama + imleç parkı): `visual-scroll.ts`.
  await prepareFrame(page);
  await expect(page).toHaveScreenshot("login-page.png", { fullPage: true });
});
