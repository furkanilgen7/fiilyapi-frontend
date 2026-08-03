import { test, expect } from "@playwright/test";

// F-TH T6 · Taşeron Hakediş detayı görsel testi. `e2e/progress-payment-
// detail-visual.spec.ts` deseninin BİREBİR aynısı. `scpp-3` (sc-1, Temmuz
// 2026) `pending_approval` durumundadır — aksiyon butonları (Reddet/Onayla)
// kadrajda olsun diye (İşveren `pp-5` seçimiyle AYNI gerekçe). Bu kayıt
// `e2e/subcontractor-progress-payments.spec.ts`in HİÇBİR testinde mutasyona
// uğramaz (yalnız `scpp-6`/`scpp-7` — `hiddenFromLists: true` — mutasyona
// uğrar, brief §⛔ tuzak 2).
//
// Bu ekranın mockup'ı YOK (kullanıcı kararı S1) — yerleşim `Ekran 15 -
// İşveren Hakedişi.dc.html`nin taşeron uyarlaması
// (`SubcontractorProgressPaymentDetailView` yorumuna bkz.). "Sözleşme
// İlerlemesi" kartı HER ZAMAN pending (şemada karşılığı yok, İşveren'in
// tersi bilinçli karar) — bu da baseline'a GERÇEK bir görünüm olarak girer.
//
// Mock oturumda (`ME`) `permissions` alanı YOKTUR → bilinmezlik kuralı
// gereği tüm yazma yüzeyleri ve aksiyon butonları GÖRÜNÜR hâlde baseline'a
// girer.
//
// Baseline `.png` YALNIZ Linux CI'da üretilir (visual-baselines.yml →
// workflow_dispatch); macOS'ta koşturulup commit edilmez.
test("taseron hakedisi detayi (onay bekliyor) ekrani gorsel", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();

  await page.goto("/hakedisler/taseron/scpp-3");
  await expect(page.getByRole("heading", { name: "Taşeron Hakedişi #3" })).toBeVisible();
  // İçerik yüklendi: Ödeme Hesabı'nın net değeri + aksiyon butonları basılı
  // olmadan ekran görüntüsü alınırsa baseline yükleme durumunu dondurur.
  await expect(page.getByText("₺ 20.520")).toBeVisible();
  await expect(page.getByRole("button", { name: "Onayla" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reddet" })).toBeVisible();
  await expect(page).toHaveScreenshot("taseron-hakedis-detay-onay-bekliyor.png", { fullPage: true });
});
