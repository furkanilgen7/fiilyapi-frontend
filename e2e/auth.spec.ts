import { test, expect } from "@playwright/test";

test("giris → ana sayfa → cikis akisi", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();

  await expect(page.getByText(/Ahmet Yılmaz/)).toBeVisible();

  await page.getByRole("button", { name: /çıkış yap/i }).click();
  await expect(page).toHaveURL(/\/login/);
});

test("yanlis parola hata gosterir", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("wrong");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByText(/e-posta veya şifre hatalı/i)).toBeVisible();
});

test("oturumsuz korumali rota /login'e yonlendirir", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login\?next=%2F/);
});

test("token cookie httpOnly — document.cookie'de gorunmez", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByText(/Ahmet Yılmaz/)).toBeVisible();
  const cookieStr = await page.evaluate(() => document.cookie);
  expect(cookieStr).not.toContain("fiil_access");
});
