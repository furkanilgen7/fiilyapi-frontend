import { test, expect } from "@playwright/test";

// Diger e2e spec'lerindeki (auth/settings) giris akisinin ayni yardimcisi.
async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

test("gosterge paneli yuklenir", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
  await expect(page.getByText(/Görünümü/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Kule A" })).toBeVisible();
});

test("sirket varliklari kalemi acilir", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Şirket Varlıkları" }).click();
  await expect(page).toHaveURL(/sirket-varliklari/);
});
