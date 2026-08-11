import { test, expect } from "@playwright/test";

import { prepareFrame } from "./visual-scroll";

// F-P6 T4 · Bölüm formu (ekleme + düzenleme) görsel testi (mockup
// "Form - Bolum Ekle.dc.html"). İKİ test de READ-ONLY'dir — hiçbiri submit
// ETMEZ, yalnız formu render eder (`site-form-visual.spec.ts` /
// `progress-payment-form-visual.spec.ts` deseninin aynısı: create kipi hiç
// mutasyon yapmadan ekran görüntüsü alır). Düzenleme kipi ekran görüntüsü
// sec-2'yi (A-Blok Şantiyesi) yalnız GET ile okur, PATCH TETİKLEMEZ — hiçbir
// paylaşılan fikstürü mutasyona uğratmadığı için `section-detail-visual.spec.ts`
// / `site-detail-visual.spec.ts` ile YARIŞMAZ.
//
// Mock oturumda (`ME`) `permissions` alanı YOKTUR → bilinmezlik kuralı gereği
// tüm yazma yüzeyleri (seçiciler, butonlar) GÖRÜNÜR/etkin hâlde baseline'a girer.
//
// Baseline `.png` YALNIZ Linux CI'da üretilir (visual-baselines.yml →
// workflow_dispatch); macOS'ta koşturulup commit edilmez.
async function login(page: import("@playwright/test").Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

test("yeni bolum formu gorsel", async ({ page }) => {
  await login(page);

  await page.goto("/projeler/p-1/santiyeler/s-1/bolumler/yeni");
  await expect(page.getByRole("heading", { level: 1, name: "Yeni Bölüm (Faz) Ekle" })).toBeVisible();

  // Kullanıcı sorgusu (GET /users) çözüldü — seçiciler `disabled` durumda
  // dondurulmadan çekilmesin (yükleme durumu baseline'a girmesin).
  await expect(page.getByLabel("Bölüm Sorumlusu")).toBeEnabled();

  // Son kart (Bölüm Belgeleri) render oldu — sayfanın tamamı kadrajda.
  await expect(page.getByRole("heading", { name: /Bölüm Belgeleri/ })).toBeVisible();

  // Kadraj hazırlığı (kaydırma sıfırlama + imleç parkı): `visual-scroll.ts`.
  await prepareFrame(page);
  await expect(page).toHaveScreenshot("bolum-formu-yeni.png", { fullPage: true });
});

test("bolum duzenle formu gorsel", async ({ page }) => {
  await login(page);

  // sec-2: A-Blok Şantiyesi altında tamamlanmış, kısmen dolu ikinci fikstür
  // (site-detail-visual.spec.ts bu kaydı YALNIZ site listesinde gösterir,
  // buradaki GET onu etkilemez).
  await page.goto("/projeler/p-1/santiyeler/s-1/bolumler/sec-2/duzenle");
  await expect(page.getByRole("heading", { level: 1, name: "Bölümü Düzenle" })).toBeVisible();
  await expect(page.getByLabel("Bölüm Adı")).toHaveValue("Zemin Kat Kaba İnşaat");
  await expect(page.getByLabel("Bölüm Sorumlusu")).toBeEnabled();
  await expect(page.getByRole("heading", { name: /Bölüm Belgeleri/ })).toBeVisible();

  // Kadraj hazırlığı (kaydırma sıfırlama + imleç parkı): `visual-scroll.ts`.
  await prepareFrame(page);
  await expect(page).toHaveScreenshot("bolum-formu-duzenle.png", { fullPage: true });
});
