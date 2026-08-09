import { test, expect } from "@playwright/test";

import { login, settleScrollTop } from "./contracts-visual-helpers";

// F-P5 T8 · TSD (`/sozlesmeler/taseron/sc-1`) görsel testi. Kanon: projedesign
// `Taşeron Sözleşme Detay.dc.html`.
//
// ⚠️ EN KRİTİK BEKLEME (bu ekrana özgü): "Hakediş %" kolonu N PARALEL hakediş
// detay sorgusu (`useSubcontractorPaymentLines`) bitene kadar "—" basar, sonra
// çubuklu yüzdeye döner. Erken kadraj İKİ FARKLI kare üretirdi. Bu yüzden
// yerleşim iddiası doğrudan o hücreye bakar: `tsd-progress-E.01` "%" İÇERENE
// kadar beklenir — sabit `waitForTimeout` DEĞİL, durum-tabanlı `expect`.
//
// ⚠️ `.tsd` kökünde `animation: var(--anim-fade-up)` de vardır; aynı iddia
// fade'in ortasında kare düşmesini de engeller.
//
// 🔒 FİKSTÜR İZOLASYONU: bu dosya HİÇBİR kayda dokunmaz — B.F. hücresine
// yazılmaz, "Kaydet"e basılmaz. Bir PATCH `sc-1`in `contract_total`ını
// değiştirir ve TL/SZL karelerini kirletirdi. Hakediş geçmişi kartını besleyen
// `scpp-1..5` sabittir; fonksiyonel spec'lerin mutasyona uğrattığı
// `scpp-6`/`scpp-7` `hiddenFromLists: true` ile liste ucundan dışlanır.
//
// Baseline `.png` YALNIZ Linux CI'da üretilir; macOS'ta commit edilmez.

const CONTRACT_ID = "sc-1";

test("taseron sozlesme detayi gorsel", async ({ page }) => {
  await login(page);
  await page.goto(`/sozlesmeler/taseron/${CONTRACT_ID}`);

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Aydın Elektrik Taah.");
  // Yerleşim oturdu (1): "Yükleniyor…" dalı geçildi, zincir + poz tablosu doldu.
  await expect(page.getByTestId("tsd-chain")).toBeVisible();
  await expect(page.getByTestId("tsd-items-total")).toContainText("371.400");
  // Yerleşim oturdu (2): N paralel hakediş detay sorgusu BİTTİ — "Hakediş %"
  // kolonu artık "—" değil, çubuklu yüzde basıyor.
  await expect(page.getByTestId("tsd-progress-E.01")).toContainText("%");
  await expect(page.getByTestId("tsd-progress-E.02")).toContainText("%");
  await expect(page.getByTestId("tsd-progress-E.03")).toContainText("%");

  await settleScrollTop(page);
  await expect(page).toHaveScreenshot("taseron-sozlesme-detay.png", { fullPage: true });
});
