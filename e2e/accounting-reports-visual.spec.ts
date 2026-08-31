import { test, expect, type Page } from "@playwright/test";

import {
  ACCOUNTING_EMPTY_TIME,
  ACCOUNTING_VAT_CARRIED_TIME,
  openTrialBalance,
  openVatReturn,
} from "./accounting-helpers";
import { prepareFrame } from "./visual-scroll";

// F-MU2 T6 · Mizan + KDV Beyannamesi ekranlarının görsel kadrajları. Kanonik
// mockup'lar: `Muhasebe - Mizan.dc.html` (MZ) · `Muhasebe - KDV Beyanı.dc.html`
// (KDV).
//
// 🔴 BAŞLIK KURALI: her testin adında "gorsel" GEÇER. Beşinci kapı
// `--grep-invert "gorsel"` ile BAŞLIĞA göre süzer; içermeyen bir görsel test
// fonksiyonel turda baseline'sız koşar ve KIRMIZI olur.
//
// 🔴 DÖRT KARE, İKİ PARA DALI: K1 (devreden KDV) ve K2 (dengesiz mizan)
// MOCKUP BOŞLUKLARIDIR — çizilmemiş dallardır ve onları YALNIZ kare kanıtlar.
// Her ikisi de ayrı bir kadrajla kilitlenir.
//
// 🔒 SALT-OKUR: bu dosya hiçbir POST/PATCH/DELETE tetiklemez. Ayrıca KDV
// fikstürü mock backend'de DONMUŞ bir haritadır (`accountingState`ten
// türetilmez) ⇒ Haziran'da koşan yazma akışları bu kadrajlara `fullyParallel`
// altında bile SIZAMAZ. Mizan fikstürü de aynı şekilde donmuştur.
//
// 📅 SAAT DONDURULUR (`page.clock`, NAVİGASYONDAN ÖNCE): iki ekranın da dönemi
// `new Date()`ten gelir. Dondurulmasaydı gerçek ay geldiğinde tablolar boş
// iner ve kadraj sessizce ANLAMSIZLAŞIRDI — boş bir tablo da geçerli bir
// karedir, kimse fark etmezdi.
//
// ⚠️ Sabit `waitForTimeout` YOKTUR; her bekleme durum tabanlıdır.
//
// Baseline `.png` YALNIZ Linux CI'da üretilir (visual-baselines.yml →
// workflow_dispatch → artifact → `e2e/`); macOS'ta koşturulup commit edilmez.

const VISUAL_VIEWPORT = { width: 1440, height: 900 } as const;

/**
 * Hiçbir kadrajda yükleme metni KALMAZ (WORKFLOW §4, 1. parça). Her iki ekran
 * da TEK sorgu ile beslenir (`useTrialBalance` / `useVatReturn` — hook
 * katmanına bakılarak ölçüldü, tahmin edilmedi), ama kabuk da metin
 * basabileceği için ortak kalıp + yüzeyin KENDİ işareti birlikte ölçülür.
 */
async function expectNoLoadingText(page: Page) {
  await expect(page.getByText(/yükleniyor/i)).toHaveCount(0);
  await expect(page.getByTestId("mz-loading")).toHaveCount(0);
  await expect(page.getByTestId("kdv-loading")).toHaveCount(0);
}

// ---------------------------------------------------------------------------
// 1) MZ · Mizan — DENGELİ (Temmuz 2026)
// ---------------------------------------------------------------------------
test("muhasebe mizan gorsel", async ({ page }) => {
  await page.setViewportSize({ ...VISUAL_VIEWPORT });
  await openTrialBalance(page);

  await expect(page.getByRole("heading", { level: 1, name: "Mizan" })).toBeVisible();

  // 🔴 Damga ("mz-loaded") "veri geldi" der, "ekrana bastı" DEMEZ — tek
  // kaynağın GERÇEK rakamları ayrıca ölçülür (WORKFLOW §4, 5. parça).
  //
  // 📅 `page.clock` KANITI + MZ:45'in BİRİKİMLİ aralığı.
  await expect(page.getByTestId("mu-period-label")).toHaveText("Ocak–Temmuz 2026");

  const table = page.getByRole("region", { name: "Mizan" });
  await expect(table.locator("tbody tr")).toHaveCount(9);

  // Üç sütun semantiğinin ÜÇÜ de kadrajda:
  // (a) dönem BRÜT — iki taraf birden dolu (MZ:85-86).
  const kasa = page.getByTestId("mz-row-100");
  await expect(kasa).toContainText("2.640.000");
  await expect(kasa).toContainText("2.535.200");
  // (b) kapanış NET/BORÇ — kırmızı dal (MZ:87).
  await expect(kasa).toContainText("284.800");
  // (c) kapanış NET/ALACAK — yeşil dal (MZ:128).
  await expect(page.getByTestId("mz-row-320")).toContainText("2.184.000");
  // (d) açılışı HİÇ olmayan hesap: dört hücresi birden `—` (MZ:143-145).
  await expect(page.getByTestId("mz-row-600")).toContainText("24.870.500");

  // Denge banner'ı YEŞİL dalda ve GENEL TOPLAM basıldı.
  const banner = page.getByTestId("mz-banner");
  await expect(banner).toHaveClass(/mu-banner--ok/);
  await expect(banner).toContainText("₺ 27.466.500");
  await expect(page.getByTestId("mz-totals")).toContainText("GENEL TOPLAM");

  // 🔴 EXPORT-XLSX: "Excel" ETKİN, "PDF" hâlâ devre dışı (ayrı dilim).
  await expect(page.getByTestId("mz-export-excel")).toBeEnabled();
  await expect(page.getByTestId("mz-export-pdf")).toBeDisabled();
  await expect(page.getByTestId("mz-export-reason")).toBeVisible();
  await expectNoLoadingText(page);

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("muhasebe-mizan.png", { fullPage: true });
});

// ---------------------------------------------------------------------------
// 2) MZ · Mizan — DENGESİZ (Ocak 2026) · 🔴 K2'nin çizilmemiş dalı
// ---------------------------------------------------------------------------
// Yevmiye defterinin BOŞ dönem karesiyle ÇAKIŞMAZ: o kare `/muhasebe`
// kökündedir ve defter/özet/fiş uçlarına bakar, `/trial-balance`e DEĞİL.
test("muhasebe mizan dengesiz gorsel", async ({ page }) => {
  await page.setViewportSize({ ...VISUAL_VIEWPORT });
  await openTrialBalance(page, ACCOUNTING_EMPTY_TIME);

  // 📅 Ocak saatinde aralık TEK aya iner (aynı pencerenin kısa yazımı).
  await expect(page.getByTestId("mu-period-label")).toHaveText("Ocak 2026");

  const table = page.getByRole("region", { name: "Mizan" });
  await expect(table.locator("tbody tr")).toHaveCount(3);

  // 🔴 K2 — banner KIRMIZI dala döndü, ikon uyarı üçgeni ve fark BASILDI.
  const banner = page.getByTestId("mz-banner");
  await expect(banner).toHaveClass(/mu-banner--off/);
  await expect(banner).toContainText("Mizan Dengede Değil");
  await expect(banner).toContainText("fark: ₺ 140.000");
  // İki kapanış toplamı gerçekten FARKLI (kadrajın asıl konusu).
  await expect(page.getByTestId("mz-totals")).toContainText("140.000");
  await expect(page.getByTestId("mz-totals")).toContainText("280.000");
  await expectNoLoadingText(page);

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("muhasebe-mizan-dengesiz.png", { fullPage: true });
});

// ---------------------------------------------------------------------------
// 3) KDV · Beyanname — ÖDENECEK (Haziran 2026, mockup dalı)
// ---------------------------------------------------------------------------
test("muhasebe kdv beyani gorsel", async ({ page }) => {
  await page.setViewportSize({ ...VISUAL_VIEWPORT });
  await openVatReturn(page);

  await expect(page.getByRole("heading", { level: 1, name: "KDV Beyannamesi" })).toBeVisible();
  // 📅 `page.clock` + K4 KANITI: Temmuz saatinde beyanname HAZİRAN'ındır.
  await expect(page.getByTestId("mu-period-label")).toHaveText("Haziran 2026");

  // Üç kart — üçünün de GERÇEK rakamı.
  await expect(page.getByTestId("kdv-card-calculated")).toContainText("₺ 924.000");
  await expect(page.getByTestId("kdv-card-deductible")).toContainText("₺ 412.000");
  await expect(page.getByTestId("kdv-card-outcome")).toHaveClass(/mu-vat-card--payable/);
  await expect(page.getByTestId("kdv-outcome-amount")).toContainText("₺ 512.000");
  // Tarihin NOKTALI biçimi (KDV:68).
  await expect(page.getByTestId("kdv-card-outcome")).toContainText("Vade: 28.07.2026");

  // Tablo 1: iki oran satırı + istisna satırı + toplam = DÖRT satır.
  const table1 = page.getByRole("region", { name: "Tablo 1 — Matrah ve Vergi" });
  await expect(table1.locator("tbody tr")).toHaveCount(4);
  await expect(page.getByTestId("kdv-taxable-rate-20.00")).toContainText("%20 oranlı teslimler");
  await expect(page.getByTestId("kdv-taxable-exempt")).toContainText("İstisna İşlemler");
  // İstisna TOPLAMA dâhildir: 4.120.000 + 1.000.000 + 500.000
  await expect(page.getByTestId("kdv-taxable-base-total")).toHaveText("5.620.000");

  // İndirimler: sunucunun TEK satırı + toplam.
  const deductions = page.getByRole("region", { name: "İndirimler" });
  await expect(deductions.locator("tbody tr")).toHaveCount(2);
  await expect(page.getByTestId("kdv-deduction-base-total")).toHaveText("2.060.500");

  // Sonuç şeridi: turuncu, aritmetik parantezde, UZUN tarih biçimi (KDV:139).
  const result = page.getByTestId("kdv-result");
  await expect(result).toHaveClass(/mu-vat-result--payable/);
  await expect(result).toContainText("Ödenecek KDV (924.000 – 412.000)");
  await expect(page.getByTestId("kdv-result-date")).toHaveText("Son ödeme tarihi: 28 Temmuz 2026");

  await expect(page.getByTestId("kdv-xml")).toBeDisabled();
  await expect(page.getByTestId("kdv-send")).toBeDisabled();
  await expect(page.getByTestId("kdv-send-reason")).toBeVisible();
  await expectNoLoadingText(page);

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("muhasebe-kdv-beyani.png", { fullPage: true });
});

// ---------------------------------------------------------------------------
// 4) KDV · Beyanname — DEVREDEN (Ocak 2026) · 🔴 K1'in çizilmemiş dalı
// ---------------------------------------------------------------------------
test("muhasebe kdv devreden gorsel", async ({ page }) => {
  await page.setViewportSize({ ...VISUAL_VIEWPORT });
  await openVatReturn(page, ACCOUNTING_VAT_CARRIED_TIME);

  // 📅 Şubat saatinde beyanname OCAK'ındır (K4).
  await expect(page.getByTestId("mu-period-label")).toHaveText("Ocak 2026");

  // 🔴 K1 — üçüncü kart BAŞLIK, TON, TUTAR ve NOT olarak birlikte döndü.
  const card = page.getByTestId("kdv-card-outcome");
  await expect(card).toHaveClass(/mu-vat-card--carried/);
  await expect(card).toContainText("Devreden KDV");
  await expect(card).toContainText("Gelecek döneme devreder");
  await expect(card).not.toContainText("Vade:");
  await expect(page.getByTestId("kdv-outcome-amount")).toContainText("₺ 340.000");

  // 🔴 K7 — bu ekranda SIFIR `0` yazılır, `—` DEĞİL (Mizan'ın TERSİ kuralı;
  // bu fikstürde `exempt_base = 0` olduğu için kadrajda fiilen görünür).
  await expect(page.getByTestId("kdv-taxable-exempt")).toContainText("0");

  // 🔴 Sonuç şeridi yeşile döndü, aritmetik TERS yazıldı ve tarih satırı
  // HİÇ BASILMADI (ödenecek tutar yokken olgusal olarak yanlış olurdu).
  const result = page.getByTestId("kdv-result");
  await expect(result).toHaveClass(/mu-vat-result--carried/);
  await expect(result).toContainText("Devreden KDV (520.000 – 180.000)");
  await expect(page.getByTestId("kdv-result-date")).toHaveCount(0);
  await expectNoLoadingText(page);

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("muhasebe-kdv-devreden.png", { fullPage: true });
});
