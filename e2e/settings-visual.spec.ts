import { test, expect } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByText(/Hoş geldiniz/)).toBeVisible();
}

test("gorsel: ayarlar kullanicilar", async ({ page }) => {
  await login(page);
  await page.goto("/ayarlar/kullanicilar");
  await expect(page.getByRole("cell", { name: "Ahmet Yılmaz" })).toBeVisible();
  await expect(page).toHaveScreenshot("ayarlar-kullanicilar.png", { fullPage: true });
});

test("gorsel: ayarlar roller", async ({ page }) => {
  await login(page);
  await page.goto("/ayarlar/roller");
  await expect(page.getByText("Sistem Yöneticisi")).toBeVisible();
  await expect(page).toHaveScreenshot("ayarlar-roller.png", { fullPage: true });
});

test("gorsel: ayarlar izin matrisi", async ({ page }) => {
  await login(page);
  await page.goto("/ayarlar/izin-matrisi");
  await expect(page.getByText("Genel")).toBeVisible();
  await expect(page).toHaveScreenshot("ayarlar-izin-matrisi.png", { fullPage: true });
});
