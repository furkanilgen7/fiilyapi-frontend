import { test, expect, type Page } from "@playwright/test";

import {
  ACCOUNTING_EMPTY_TIME,
  BALANCE_SHEET_DEFAULT_AS_OF,
  BALANCE_SHEET_IMBALANCED_AS_OF,
  openBalanceSheet,
  openCashFlowStatement,
  openFinancialStatementsHome,
} from "./accounting-helpers";
import { prepareFrame } from "./visual-scroll";

// F-MT T6 · Bilanço + Nakit Akış Tablosu + Mali Tablolar kökünün görsel
// kadrajları. Kanonik mockup'lar: `Mali Tablo - Bilanço.dc.html` (BL) ·
// `Mali Tablo - Nakit Akışı.dc.html` (NA) · `Ekran 11 - Mali Tablo.dc.html`
// (E11).
//
// 🔴 BAŞLIK KURALI: her testin adında "gorsel" GEÇER. Beşinci kapı
// `--grep-invert "gorsel"` ile BAŞLIĞA göre süzer; içermeyen bir görsel test
// fonksiyonel turda baseline'sız koşar ve KIRMIZI olur.
//
// 🔴 DÖRT KARE, BİRİ MOCKUP BOŞLUĞU: `mali-tablolar-bilanco-dengesiz` (K3'ün
// dengesiz dalı) hiçbir mockup'ta ÇİZİLMEMİŞTİR — o dalın var olduğunu
// YALNIZ bu kare kanıtlar (`accounting-reports-visual`in K1/K2 emsali).
//
// 🔒 SALT-OKUR: bu dosya hiçbir POST/PATCH/DELETE tetiklemez. Üç ekranın da
// uçları YALNIZ `GET` tanımlar; ayrıca `balanceSheetFixture` /
// `cashFlowStatementFixture` mock backend'de DONMUŞ haritalardır
// (`accountingState`ten TÜRETİLMEZ) ⇒ Haziran'ın mutasyon adasında koşan
// yazma akışları bu kadrajlara `fullyParallel` altında bile SIZAMAZ.
//
// 📅 SAAT DONDURULUR (`page.clock`, NAVİGASYONDAN ÖNCE — `open*` helper'ları
// yapar): bilanço günü ve nakit akışı dönemi `new Date()`ten türer.
// Dondurulmasaydı gerçek ay geldiğinde tablolar SIFIR gövdeyle inerdi (uçlar
// tanınmayan dönemde 404 DEĞİL, yapısal olarak geçerli sıfır döndürür) ve
// kadraj sessizce ANLAMSIZLAŞIRDI — sıfır bir bilanço da geçerli bir karedir,
// kimse fark etmezdi.
//
// ⚠️ Sabit `waitForTimeout` YOKTUR; her bekleme durum tabanlıdır.
//
// Baseline `.png` YALNIZ Linux CI'da üretilir (visual-baselines.yml →
// workflow_dispatch → artifact → `e2e/`); macOS'ta koşturulup commit edilmez.

const VISUAL_VIEWPORT = { width: 1440, height: 900 } as const;

/**
 * Hiçbir kadrajda yükleme metni KALMAZ (WORKFLOW §4, 1. parça).
 *
 * 🔴 SORGU SAYISI HOOK KATMANINA BAKILARAK ÖLÇÜLDÜ, TAHMİN EDİLMEDİ:
 * `BalanceSheetView` TEK sorgu (`useBalanceSheet`), `CashFlowStatementView`
 * TEK sorgu (`useCashFlowStatement` — KPI şeridi, A/B/C tablosu, aylık grafik
 * ve kapanış satırlarının HEPSİ o TEK yanıttan beslenir),
 * `FinancialStatementsHomeView` ise HİÇ sorgu yapmaz (üç veri yüzeyi de
 * devre dışıdır). Üçünde de `useModulePermission` AĞA ÇIKMAZ —
 * `SessionProvider`ın zaten çektiği `/auth/me` yükünü okur.
 *
 * Yine de kabuk da metin basabileceği için ortak kalıp + yüzeylerin KENDİ
 * işaretleri birlikte ölçülür.
 */
async function expectNoLoadingText(page: Page) {
  await expect(page.getByText(/yükleniyor/i)).toHaveCount(0);
  await expect(page.getByTestId("bl-loading")).toHaveCount(0);
  await expect(page.getByTestId("na-loading")).toHaveCount(0);
}

// ---------------------------------------------------------------------------
// 1) BL · Bilanço — DENGELİ (31 Temmuz 2026)
// ---------------------------------------------------------------------------
test("mali tablolar bilanco gorsel", async ({ page }) => {
  await page.setViewportSize({ ...VISUAL_VIEWPORT });
  await openBalanceSheet(page);

  await expect(page.getByRole("heading", { level: 1, name: "Bilanço" })).toBeVisible();

  // 🔴 Damga ("bl-loaded") "veri geldi" der, "ekrana bastı" DEMEZ — tek
  // kaynağın GERÇEK rakamları ayrıca ölçülür (WORKFLOW §4, 5. parça).
  //
  // 📅 `page.clock` KANITI: nokta-zaman seçici içinde bulunulan AYIN SON günü.
  await expect(page.getByTestId("bl-as-of")).toHaveValue(BALANCE_SHEET_DEFAULT_AS_OF);

  // İki taraf da TAM olarak indi (satır sayıları fikstürden türer: bant +
  // kalemler + ara toplam, en sonda genel toplam).
  const assets = page.getByRole("region", { name: "AKTİF (Varlıklar)" });
  const liabilities = page.getByRole("region", { name: "PASİF (Kaynaklar)" });
  await expect(assets.locator("tbody tr")).toHaveCount(11);
  await expect(liabilities.locator("tbody tr")).toHaveCount(14);

  // 🔴 K3 — banner YEŞİL dalda.
  const banner = page.getByTestId("bl-banner");
  await expect(banner).toHaveClass(/fs-banner--ok/);
  await expect(banner).toContainText("Bilanço Dengede");

  // İki taraf AYNI genel toplamı basar (dengenin asıl kanıtı).
  await expect(page.getByTestId("bl-assets-total")).toContainText("22.642.220");
  await expect(page.getByTestId("bl-liabilities-total")).toContainText("22.642.220");
  // Ara toplamlar ve bölüm bantları da kadrajda.
  await expect(page.getByTestId("bl-assets-current-subtotal")).toContainText("18.782.220");
  await expect(page.getByTestId("bl-assets-fixed-subtotal")).toContainText("3.860.000");
  await expect(page.getByTestId("bl-liabilities-equity-band")).toContainText("ÖZKAYNAKLAR");
  // 🔴 TEK KAYNAK — nakit akışının `DÖNEM SONU NAKİT`iyle AYNI sabitten gelir.
  await expect(page.getByTestId("bl-assets-current-cash")).toContainText("6.249.500");
  // 🔴 K4 — kontra hesap (257) SUNUCUDA netlenir: tek ve POZİTİF satır.
  await expect(page.getByTestId("bl-assets-fixed-tangible")).toContainText("3.620.000");

  // Devre-dışı yüzey + GÖRÜNÜR gerekçe bandı da kadrajın parçasıdır.
  await expect(page.getByTestId("bl-export-pdf")).toBeDisabled();
  await expect(page.getByTestId("bl-export-reason")).toBeVisible();
  await expect(page.getByTestId("bl-error")).toHaveCount(0);

  // Drill sidebar kadrajın SOL sütunudur (BL:24-31) ve doğru öğesi işaretli.
  const sidebar = page.getByRole("complementary", { name: "Mali tablolar menüsü" });
  await expect(sidebar.locator("[aria-current='page']")).toHaveText("Bilanço");
  await expectNoLoadingText(page);

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("mali-tablolar-bilanco.png", { fullPage: true });
});

// ---------------------------------------------------------------------------
// 2) BL · Bilanço — DENGESİZ (31 Ocak 2026) · 🔴 K3'ün çizilmemiş dalı
// ---------------------------------------------------------------------------
// Mizan'ın dengesiz karesiyle ÇAKIŞMAZ: o kare `/muhasebe/mizan`dadır ve
// `/trial-balance` ucuna bakar, `/balance-sheet`e DEĞİL.
test("mali tablolar bilanco dengesiz gorsel", async ({ page }) => {
  await page.setViewportSize({ ...VISUAL_VIEWPORT });
  await openBalanceSheet(page, ACCOUNTING_EMPTY_TIME);

  // 📅 Ocak saatinde varsayılan gün ayın son günüdür.
  await expect(page.getByTestId("bl-as-of")).toHaveValue(BALANCE_SHEET_IMBALANCED_AS_OF);

  const assets = page.getByRole("region", { name: "AKTİF (Varlıklar)" });
  const liabilities = page.getByRole("region", { name: "PASİF (Kaynaklar)" });
  await expect(assets.locator("tbody tr")).toHaveCount(5);
  await expect(liabilities.locator("tbody tr")).toHaveCount(8);

  // 🔴 K3 — banner KIRMIZI dala döndü; başlık, gerekçe ve FARK birlikte
  // basıldı. `≠` glifi YAZILMAZ (F-SEM glif kuralı), "eşit değil" yazılır.
  const banner = page.getByTestId("bl-banner");
  await expect(banner).toHaveClass(/fs-banner--off/);
  await expect(banner).toContainText("Bilanço Dengede Değil");
  await expect(banner).toContainText("eşit değil");
  await expect(banner).toContainText("fark: ₺ 140.000");

  // Kadrajın asıl konusu: iki genel toplam gerçekten FARKLI.
  await expect(page.getByTestId("bl-assets-total")).toContainText("1.500.000");
  await expect(page.getByTestId("bl-liabilities-total")).toContainText("1.360.000");
  // 🔴 Bilanço dengesizken bile NAKİT tek kaynaktan gelir (Ocak nakit akışı).
  await expect(page.getByTestId("bl-assets-current-cash")).toContainText("1.200.000");
  await expect(page.getByTestId("bl-error")).toHaveCount(0);
  await expectNoLoadingText(page);

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("mali-tablolar-bilanco-dengesiz.png", { fullPage: true });
});

// ---------------------------------------------------------------------------
// 3) NA · Nakit Akış Tablosu (Ocak–Temmuz 2026)
// ---------------------------------------------------------------------------
test("mali tablolar nakit akisi gorsel", async ({ page }) => {
  await page.setViewportSize({ ...VISUAL_VIEWPORT });
  await openCashFlowStatement(page);

  // 🔴 Sayfa başlığı sidebar etiketinden (`Nakit Akışı`) BİLEREK FARKLIdır.
  await expect(page.getByRole("heading", { level: 1, name: "Nakit Akış Tablosu" })).toBeVisible();
  // 📅 `page.clock` KANITI: birikimli aralık seçicisi içinde bulunulan ayda.
  await expect(page.getByTestId("na-period")).toHaveValue("2026-07");

  // (a) KPI şeridi — DÖRT kartın da GERÇEK rakamı, üç ton birden.
  await expect(page.getByTestId("na-kpis").locator(".fs-cf-kpi")).toHaveCount(4);
  await expect(page.getByTestId("na-kpi-operating")).toContainText("+ 5.842.000");
  await expect(page.getByTestId("na-kpi-investing")).toContainText("- 1.240.000");
  await expect(page.getByTestId("na-kpi-financing")).toContainText("- 800.000");
  // 🔴 K2 — net kart sunucunun `net_change`ini basar (mockup'ın 4.802.000'i
  // DEĞİL); tablonun orta kapanış satırıyla AYNI sayıdır.
  await expect(page.getByTestId("na-kpi-net")).toContainText("+ 3.802.000");

  // (b) A/B/C tablosu — üç bölüm bandı, kalemler ve ara toplamlar.
  await expect(page.getByTestId("na-table").locator("tbody tr")).toHaveCount(16);
  await expect(page.getByTestId("na-section-operating-band")).toContainText(
    "A. İŞLETME FAALİYETLERİNDEN NAKITLER",
  );
  await expect(page.getByTestId("na-section-operating-collections")).toContainText("+ 24.994.700");
  await expect(page.getByTestId("na-section-operating-subtotal")).toContainText("+ 5.842.000");
  await expect(page.getByTestId("na-section-investing-subtotal")).toContainText("- 1.240.000");
  await expect(page.getByTestId("na-section-financing-subtotal")).toContainText("- 800.000");

  // (c) ÜÇ SATIRLI kapanış — bakiyeler işaretsiz, akış işaretli.
  await expect(page.getByTestId("na-opening")).toContainText("2.447.500");
  await expect(page.getByTestId("na-net-change")).toContainText("+ 3.802.000");
  // 🔴 TEK KAYNAK — bilançonun `Kasa ve Bankalar`ıyla AYNI rakam.
  await expect(page.getByTestId("na-closing")).toContainText("6.249.500");

  // (d) Aylık nakit grafiği — bir AY SONU BAKİYE serisidir; boş dal BASILMADI
  // ve yedi ay etiketi çizildi (kadrajın SVG'si gerçekten doldu).
  await expect(page.getByTestId("na-chart-empty")).toHaveCount(0);
  await expect(page.getByTestId("na-chart").getByRole("img")).toHaveAttribute(
    "aria-label",
    "Aylık nakit pozisyonu — 7 ay, dönem sonu 6.249.500",
  );
  await expect(page.getByTestId("na-chart").locator("text")).toHaveCount(7);

  // (e) 🔴 K8 — projeksiyon kartı DEVRE DIŞI ve gerekçesi GÖRÜNÜR.
  await expect(page.getByTestId("na-projection")).toBeVisible();
  await expect(page.getByTestId("na-projection-reason")).toBeVisible();

  await expect(page.getByTestId("na-export-pdf")).toBeDisabled();
  await expect(page.getByTestId("na-export-reason")).toBeVisible();
  await expect(page.getByTestId("na-error")).toHaveCount(0);

  const sidebar = page.getByRole("complementary", { name: "Mali tablolar menüsü" });
  await expect(sidebar.locator("[aria-current='page']")).toHaveText("Nakit Akışı");
  await expectNoLoadingText(page);

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("mali-tablolar-nakit-akisi.png", { fullPage: true });
});

// ---------------------------------------------------------------------------
// 4) E11 · Mali Tablolar kökü — DEVRE DIŞI gelir tablosu yüzeyleri
// ---------------------------------------------------------------------------
// 🔴 Bu kare bir "boş durum" karesi DEĞİLDİR: gelir tablosu ucu (MT-2) henüz
// açılmadığı için üç veri yüzeyi de kasten devre dışı basılır (F-TH kanonu:
// rotası olmayan mockup öğesi SİLİNMEZ). Kare, o kararın nasıl göründüğünü
// kilitler — sayı UYDURULDUĞU gün kırmızı olur.
test("mali tablolar gelir tablosu devre disi gorsel", async ({ page }) => {
  await page.setViewportSize({ ...VISUAL_VIEWPORT });
  await openFinancialStatementsHome(page);

  await expect(page.getByRole("heading", { level: 1, name: "Mali Tablolar" })).toBeVisible();

  // 🔴 KÖKTE DRILL SIDEBAR YOKTUR (E11 düz kabuğu çizer) — kadrajın sol
  // sütunu bu yüzden BL/NA'dan farklıdır ve bu farkı kare kilitler.
  await expect(page.getByRole("complementary", { name: "Mali tablolar menüsü" })).toHaveCount(0);

  // Segment denetimi: bulunulan sekme + iki yaprak bağlantısı.
  await expect(page.getByTestId("mt-seg-current")).toHaveText("Gelir Tablosu");
  await expect(page.getByTestId("mt-seg-bilanco")).toHaveText("Bilanço");
  await expect(page.getByTestId("mt-seg-nakit-akisi")).toHaveText("Nakit Akışı");

  // Üç veri yüzeyi de BASILDI, başlıkları yerinde ve gerekçeleri GÖRÜNÜR.
  await expect(page.getByTestId("mt-income-statement")).toContainText("Gelir Tablosu");
  await expect(page.getByTestId("mt-performance")).toContainText("Performans Özeti");
  await expect(page.getByTestId("mt-profitability")).toContainText("Proje Bazlı Karlılık");
  for (const testId of ["mt-income-statement", "mt-performance", "mt-profitability"]) {
    await expect(page.getByTestId(`${testId}-reason`)).toBeVisible();
  }

  // 🔴 SAHTE DURUM BAĞLANMAZ: dönem gezgini işlemez ve mockup'ın
  // `Ocak – Temmuz 2026` etiketi BASILMAZ — yuvada `—` durur.
  await expect(page.getByTestId("mt-period-prev")).toBeDisabled();
  await expect(page.getByTestId("mt-period-next")).toBeDisabled();
  await expect(page.getByTestId("mt-period-label")).toHaveText("—");
  await expect(page.getByTestId("mt-project-filter")).toBeDisabled();

  await expect(page.getByTestId("mt-export-pdf")).toBeDisabled();
  await expect(page.getByTestId("mt-export-reason")).toBeVisible();
  await expect(page.getByTestId("mt-period-reason")).toBeVisible();
  await expect(page.getByTestId("mt-project-filter-reason")).toBeVisible();
  await expectNoLoadingText(page);

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("mali-tablolar-gelir-tablosu-devre-disi.png", {
    fullPage: true,
  });
});
