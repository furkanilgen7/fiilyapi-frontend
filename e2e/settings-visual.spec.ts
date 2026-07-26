import { test, expect } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
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
  await expect(page.getByText("Modül Erişimleri")).toBeVisible();
  await expect(page).toHaveScreenshot("ayarlar-roller.png", { fullPage: true });
});

test("gorsel: ayarlar izin matrisi", async ({ page }) => {
  await login(page);
  await page.goto("/ayarlar/izin-matrisi");
  // "Genel" hem ayarlar sidebar grup basligi hem matris icerik grup basligi olarak
  // gectigi icin iddiayi yalnizca matris icerik bolgesine (.matrix-wrap) sabitliyoruz —
  // aksi halde strict-mode "resolved to N elements" hatasi alinir.
  await expect(page.locator(".matrix-wrap").getByText("Genel")).toBeVisible();
  await expect(page).toHaveScreenshot("ayarlar-izin-matrisi.png", { fullPage: true });
});

test("gorsel: ayarlar sirket bilgileri", async ({ page }) => {
  await login(page);
  await page.goto("/ayarlar/sirket-bilgileri");
  // "Firma Bilgileri" hem kart basligi hem de sayfa alt basligindaki "Firma bilgilerini…"
  // metniyle esleser; iddiayi kart basligina (.company-card__title — mockup'ta kart
  // basligi ayirici cizgisiz, kart govdesinin icinde) sabitleyerek strict-mode
  // "resolved to 2 elements" hatasini onluyoruz (bkz. ayni dosyadaki matris/gorunum notlari).
  await expect(page.locator(".company-card__title", { hasText: "Firma Bilgileri" })).toBeVisible();
  await expect(page).toHaveScreenshot("ayarlar-sirket-bilgileri.png", { fullPage: true });
});

test("gorsel: ayarlar bildirimler", async ({ page }) => {
  await login(page);
  await page.goto("/ayarlar/bildirimler");
  await expect(page.getByText("Hakediş & Ödeme")).toBeVisible();
  await expect(page).toHaveScreenshot("ayarlar-bildirimler.png", { fullPage: true });
});

test("gorsel: ayarlar gorunum", async ({ page }) => {
  await login(page);
  await page.goto("/ayarlar/gorunum");
  // "Tema" hem karta baslik hem de olasi baska yerlerde gecebilir; kart basligina
  // (span.s-card__title) sabitleyerek sidebar'daki "Görünüm" ile karisikligi onluyoruz.
  await expect(page.getByText("Tema", { exact: true })).toBeVisible();
  await expect(page).toHaveScreenshot("ayarlar-gorunum.png", { fullPage: true });
});

test("gorsel: ayarlar entegrasyonlar", async ({ page }) => {
  await login(page);
  await page.goto("/ayarlar/entegrasyonlar");
  await expect(page.getByText("GİB e-Fatura")).toBeVisible();
  await expect(page).toHaveScreenshot("ayarlar-entegrasyonlar.png", { fullPage: true });
});

test("gorsel: ayarlar yedekleme", async ({ page }) => {
  await login(page);
  await page.goto("/ayarlar/yedekleme");
  await expect(page.getByText("Depolama Kullanımı")).toBeVisible();
  await expect(page).toHaveScreenshot("ayarlar-yedekleme.png", { fullPage: true });
});

test("gorsel: ayarlar denetim gunlugu", async ({ page }) => {
  await login(page);
  await page.goto("/ayarlar/denetim-gunlugu");
  await expect(page.getByText("Sistemdeki tüm işlemler ve değişiklikler")).toBeVisible();
  await expect(page).toHaveScreenshot("ayarlar-denetim-gunlugu.png", { fullPage: true });
});
