import { test, expect } from "@playwright/test";

test("projeler ekrani gorsel", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();

  await page.goto("/projeler");
  await expect(page.getByRole("heading", { name: "Projeler" })).toBeVisible();
  await expect(page).toHaveScreenshot("projects.png", { fullPage: true });
});
