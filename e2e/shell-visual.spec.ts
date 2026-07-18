import { test, expect } from "@playwright/test";

test("kabuk ana sayfa gorsel", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  // Kabuk oturmasi icin kullanici adi + karsilama gorunur olmali
  await expect(page.getByText("Ahmet Yılmaz", { exact: true })).toBeVisible();
  await expect(page.getByText(/Hoş geldiniz/)).toBeVisible();
  await expect(page).toHaveScreenshot("shell-home.png", { fullPage: true });
});
