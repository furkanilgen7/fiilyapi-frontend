import { test, expect } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByText(/Hoş geldiniz/)).toBeVisible();
}

// Ayarlar sidebar'i ("Ayarlar menüsü" aria-label'li aside) — kabuk sidebar'i occluded
// olsa da DOM'da kalir ve ayni metinlerden bazilari (Genel vb.) barindirir, bu yüzden
// gezinme ve içerik iddiaları bu kapsayıcıya (veya ilgili içerik bölgesine) sabitlenir.
function settingsSidebar(page: import("@playwright/test").Page) {
  return page.getByRole("complementary", { name: "Ayarlar menüsü" });
}

test("ayarlar: sidebar gezinme + rol goruntule + matris hucre degisimi", async ({ page }) => {
  await login(page);
  const sidebar = settingsSidebar(page);

  // /ayarlar → kullanicilar'a yonlenir
  await page.goto("/ayarlar");
  await expect(page).toHaveURL(/\/ayarlar\/kullanicilar/);
  await expect(sidebar.getByRole("link", { name: "Kullanıcılar" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("cell", { name: "Ahmet Yılmaz" })).toBeVisible();

  // Rol Yönetimi'ne gec
  await sidebar.getByRole("link", { name: "Rol Yönetimi" }).click();
  await expect(page).toHaveURL(/\/ayarlar\/roller/);
  await expect(page.locator(".role-detail__name")).toHaveText("Sistem Yöneticisi");

  // Izin Matrisi'ne gec
  await sidebar.getByRole("link", { name: "İzin Matrisi" }).click();
  await expect(page).toHaveURL(/\/ayarlar\/izin-matrisi/);
  // "Genel" hem ayarlar sidebar grup basligi hem matris icerik grup basligi olarak
  // gecer; iddiayi yalnizca matris icerik bolgesine sabitleyerek strict-mode
  // belirsizligini onluyoruz.
  const matrixContent = page.locator(".matrix-wrap");
  await expect(matrixContent.getByText("Genel")).toBeVisible();

  // Bir hucreyi degistir (system_admin disi bir rol — Santiye Sefi)
  const cell = page.getByLabel("Personel — Şantiye Şefi");
  await cell.selectOption({ label: "Tam" });
  await expect(cell).toHaveValue("full");
});

test("ayarlar: geri don linki gosterge paneline doner", async ({ page }) => {
  await login(page);

  await page.goto("/ayarlar/kullanicilar");
  await expect(page.getByRole("cell", { name: "Ahmet Yılmaz" })).toBeVisible();

  await settingsSidebar(page)
    .getByRole("link", { name: /Gösterge Paneli/ })
    .click();

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: /Hoş geldiniz/ })).toBeVisible();
});
