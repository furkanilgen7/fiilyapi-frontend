import { test, expect } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByText(/Hoş geldiniz/)).toBeVisible();
}

test("ayarlar: sekme gezinme + kullanici olustur + matris hucre degisimi", async ({ page }) => {
  await login(page);

  // /ayarlar → kullanicilar'a yonlenir
  await page.goto("/ayarlar");
  await expect(page).toHaveURL(/\/ayarlar\/kullanicilar/);
  await expect(page.getByRole("link", { name: "Kullanıcılar" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("cell", { name: "Ahmet Yılmaz" })).toBeVisible();

  // Roller sekmesi
  await page.getByRole("link", { name: "Roller" }).click();
  await expect(page).toHaveURL(/\/ayarlar\/roller/);
  await expect(page.getByText("Sistem Yöneticisi")).toBeVisible();

  // Kullanicilar'a don + yeni kullanici olustur
  await page.getByRole("link", { name: "Kullanıcılar" }).click();
  await page.getByRole("button", { name: "Yeni Kullanıcı" }).click();
  await page.getByLabel("Ad Soyad").fill("Yeni Kişi");
  await page.getByLabel("E-posta").fill("yeni@fiil.com");
  await page.getByLabel("Parola").fill("parola123");
  const roleField = page.locator("label.settings-field", { has: page.getByText("Rol", { exact: true }) });
  await roleField.locator("select").selectOption({ label: "Saha" });
  await page.getByRole("button", { name: "Kaydet" }).click();
  await expect(page.getByText("Yeni Kişi")).toBeVisible();

  // Izin matrisi: bir hucreyi degistir (system_admin disi rol)
  await page.getByRole("link", { name: "İzin Matrisi" }).click();
  await expect(page.getByText("Genel")).toBeVisible();
  const cell = page.getByLabel("Raporlar — Saha");
  await cell.selectOption({ label: "Tam" });
  await expect(cell).toHaveValue("full");
});
