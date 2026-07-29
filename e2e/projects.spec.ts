import { test, expect } from "@playwright/test";

// Diger e2e spec'lerindeki (auth/dashboard) giris akisinin ayni yardimcisi.
async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

test("projeler ekrani yuklenir ve sekme gecisi calisir", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Projeler" }).click();
  await expect(page).toHaveURL(/projeler/);
  await expect(page.getByRole("heading", { name: "Projeler" })).toBeVisible();
  await expect(page.getByText("Kule A")).toBeVisible();
  await expect(page.getByText("Bahçelievler Konut")).toBeVisible();

  await page.getByRole("tab", { name: "Taahhüt (2)" }).click();
  await expect(page).toHaveURL(/tab=taahhut/);
  await expect(page.getByText("Villa B")).not.toBeVisible();
  // Sayaclar filtreden etkilenmez
  await expect(page.getByRole("tab", { name: "Tümü (4)" })).toBeVisible();
});

test("yeni proje sayfasi acilir", async ({ page }) => {
  await login(page);
  await page.goto("/projeler");
  // F5'ten sonra "+ Yeni Proje" artik modal degil, /projeler/yeni'ye yonlendiren bir link.
  await page.getByRole("link", { name: "+ Yeni Proje" }).click();
  await expect(page).toHaveURL(/\/projeler\/yeni$/);
  await expect(page.getByRole("heading", { name: "Yeni Proje" })).toBeVisible();
});
