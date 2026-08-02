import { test, expect } from "@playwright/test";

// P7 T7 · İşveren Hakedişi detayı (Ekran 15) görsel testi. `e2e/boq-visual.spec.ts`
// deseninin BİREBİR aynısı. `pp-5` (mock-backend.ts) `pending_approval`
// durumundadır — brief §b: "en az pending_approval durumu, aksiyon
// butonları kadrajda olsun" (Reddet/Onayla, bkz. `ProgressPaymentStatusActions`).
// Değerler `Ekran 15 - İşveren Hakedişi.dc.html` satır 61-193'ten BİREBİR:
// dört grup (Betonarme/Elektrik/Mekanik/Duvar İşleri), Ödeme Hesabı (brüt
// 2.110.000 → net 2.004.500), Sözleşme İlerlemesi (%75/%75/%62).
//
// `pp-5` T7'nin fonksiyonel spec'inde (progress-payments.spec.ts) HİÇ
// mutasyona uğramaz — yalnız `pp-6` (taslak) değişir; bu ekranın verisi
// spec dosyaları arasında sabittir.
//
// Mock oturumda (`ME`) `permissions` alanı YOKTUR → bilinmezlik kuralı
// gereği tüm yazma yüzeyleri ve aksiyon butonları GÖRÜNÜR hâlde baseline'a
// girer.
//
// Baseline `.png` YALNIZ Linux CI'da üretilir (visual-baselines.yml →
// workflow_dispatch); macOS'ta koşturulup commit edilmez.
test("isveren hakedisi detayi (onay bekliyor) ekrani gorsel", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();

  await page.goto("/hakedisler/pp-5");
  await expect(page.getByRole("heading", { name: "#5 — Temmuz 2026" })).toBeVisible();
  // İçerik yüklendi: dördüncü grup satırı ve Ödeme Hesabı'nın net değeri
  // basılı olmadan ekran görüntüsü alınırsa baseline yükleme durumunu
  // dondurur.
  await expect(page.getByText("Duvar & Kaplama")).toBeVisible();
  await expect(page.getByText("₺ 2.004.500")).toBeVisible();
  await expect(page.getByRole("button", { name: "Onayla" })).toBeVisible();
  await expect(page).toHaveScreenshot("hakedis-detay-onay-bekliyor.png", { fullPage: true });
});
