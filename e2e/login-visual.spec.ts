import { test, expect } from "@playwright/test";

test("giris ekrani gorsel", async ({ page }) => {
  await page.goto("/login");
  // Font/animasyon oturmasi icin marka basligini bekle.
  await expect(page.getByText(/tek platformda yönetin/i)).toBeVisible();
  await expect(page).toHaveScreenshot("login-page.png", { fullPage: true });
});
