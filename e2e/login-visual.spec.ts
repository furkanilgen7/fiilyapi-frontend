import { test, expect } from "@playwright/test";

import { prepareFrame } from "./visual-scroll";

test("giris ekrani gorsel", async ({ page }) => {
  await page.goto("/login");
  // Font/animasyon oturmasi icin marka basligini bekle.
  await expect(page.getByText(/tek platformda yönetin/i)).toBeVisible();

  // Kadraj hazırlığı (kaydırma sıfırlama + imleç parkı): `visual-scroll.ts`.
  await prepareFrame(page);
  await expect(page).toHaveScreenshot("login-page.png", { fullPage: true });
});
