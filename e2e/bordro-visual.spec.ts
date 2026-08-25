import { test, expect, type Page } from "@playwright/test";

import { loginForPayroll, pinPayrollPeriods } from "./payroll-helpers";
import { prepareFrame } from "./visual-scroll";

/**
 * F-BOR T7 · bordro ekranlarının görsel testleri — kanon mockup'lar
 * `Bordro Yönetimi.dc.html` ("BY") · `Bordro Geçmişi.dc.html` ("BG") ·
 * `SGK Bildirimi.dc.html` ("SGK").
 *
 * BEŞ kare: aylık bordro (dolu) · dönem YOK · ORAN SETİ YOK · bordro geçmişi ·
 * SGK bildirimi.
 *
 * 🔒 SALT-OKUR: bu dosya HİÇBİR POST/PATCH tetiklemez. Onay/ödeme/SGK damgası
 * düğmelerine BASILMAZ — üçü de dönemin durumunu ve satır rozetlerini
 * oynatır ve `fullyParallel` altında hem bu dosyanın hem kardeşlerinin
 * baseline'larını sessizce kırardı. Yazma akışları `bordro.spec.ts`tedir ve
 * orada AYRI bir yıla (2025) sürgün edilmiştir.
 *
 * 🔒 FİKSTÜR SÜZGECİ: `pinPayrollPeriods` (`payroll-helpers.ts`, T6 kanonu)
 * kadrajı ilgili YILA süzer. Gerekçe `personnel-roster.ts/pinRoster` ile
 * aynıdır: `/bordro` ve `/bordro/sgk` varsayılan dönemi listenin EN YENİSİDİR,
 * yani başka bir spec'in açtığı bir ay kadrajı komple değiştirebilirdi.
 * Kanonik gövde TEK yerdedir — KOPYALANMAZ, import edilir.
 *
 * ⚠️ `bordro-gecmis` karesi BİLİNÇLİ OLARAK SÜZÜLMEZ ve bu ölçüldü: BG
 * varsayılan yılı veride geçen EN YENİ yıldır (2026) ve tbody yalnız o yılın
 * satırlarını basar. `bordro.spec.ts`in mutasyonları YALNIZ 2025 dönemlerinin
 * `status`/`paid_at` alanlarını oynatır — o satırlar bu kadrajda RENDER
 * EDİLMEZ. Yıl seçicisinin seçenekleri ise yıl KİMLİKLERİdir (2026/2025/2024),
 * mutasyondan etkilenmez. Süzmek, K6'nın asıl yüzeyini (çok yıllı seçici)
 * kareden silerdi.
 *
 * 🔴 "YÜKLENDİ" İDDİASI HER BAĞIMSIZ VERİ KAYNAĞINI KAPSAR (WORKFLOW §4, 5.
 * parça). Kaç sorgu olduğu tahmin EDİLMEDİ, hook katmanına bakıldı:
 *   • `/bordro`        → `usePayrollPeriods()`   (`GET /payroll/periods`, ay
 *                        gezgini) + `usePayrollPeriod(id)`
 *                        (`GET /payroll/periods/{id}`, KPI + tablo + tfoot).
 *                        İKİ kaynak; ikincisi birincinin kimliğine BAĞLI.
 *   • `/bordro/gecmis` → `usePayrollPeriods()` TEK kaynak (yıl süzgeci ve
 *                        tfoot toplamları istemcide türer).
 *   • `/bordro/sgk`    → `usePayrollPeriods()` + `usePayrollSgkSummary(id)`
 *                        (`GET .../sgk-summary`). İKİ kaynak.
 * Her kaynak için o kaynağa ÖZGÜ iddia yazıldı; kesişimleri (ay gezgininin
 * etiketi ↔ detayın tutarları) da ölçüldü.
 *
 * 📅 TARİH BAĞIMSIZ — `page.clock` GEREKMEZ ve bu ölçüldü: üç ekranın hiçbiri
 * `new Date()` türevi kullanmaz. Varsayılan dönem "bugün"den DEĞİL, listenin
 * kronolojik SONUNDAN gelir (`defaultPeriodId`); BG'nin varsayılan yılı da
 * veriden türer (`defaultYear`). Tarih hücreleri sunucu damgalarıdır ve
 * `new Date(...)` ile değil `slice(0, 10)` ile basılır.
 *
 * ⚠️ Sabit `waitForTimeout` YOKTUR; her bekleme durum tabanlıdır.
 * ⚠️ `getByRole("alert")` bu depoda YASAKTIR.
 *
 * Baseline `.png` YALNIZ Linux CI'da üretilir (visual-baselines.yml →
 * workflow_dispatch → artifact → `e2e/`); macOS'ta koşturulup commit edilmez.
 */

const VISUAL_VIEWPORT = { width: 1440, height: 900 } as const;

/** Yükleme/boş durum metinleri — kadraja GİREMEZLER. */
const MONTHLY_LOADING = "bordro-loading";
const HISTORY_LOADING = "bordro-gecmis-loading";
const SGK_LOADING = "bordro-sgk-loading";

async function login(page: Page) {
  await page.setViewportSize({ ...VISUAL_VIEWPORT });
  await loginForPayroll(page);
}

/**
 * KAYNAK A · `GET /payroll/periods` — ay gezgini (BY:50-54).
 * Etiket listeden gelir; detay ucundan GELMEZ (detayın `year`/`month`i de
 * vardır ama gezgin kronolojik diziyi liste üzerinden adımlar).
 */
async function expectMonthlyNavigatorLoaded(page: Page, label: string) {
  await expect(page.getByTestId("bordro-period-label")).toHaveText(label);
  await expect(page.getByTestId("bordro-periods-error")).toHaveCount(0);
  // Kırpılma korkuluğu SESSİZ: `limit` 240, dönem sayısı onun çok altında.
  await expect(page.getByTestId("bordro-truncation")).toHaveCount(0);
}

/**
 * KAYNAK B · `GET /payroll/periods/{id}` — dört KPI + tip sekmeleri + gruplu
 * tablo + tfoot. Kartların HİÇBİRİ "—" basmamalıdır: pending zarfında dördü de
 * "—" olurdu ve kare sessizce yükleme hâlini gömerdi.
 */
async function expectMonthlyDetailLoaded(page: Page) {
  await expect(page.getByTestId("bordro-loaded")).toBeAttached();
  await expect(page.getByTestId("bordro-error")).toHaveCount(0);
  await expect(page.getByTestId(MONTHLY_LOADING)).toHaveCount(0);
  await expect(page.getByTestId("bordro-empty")).toHaveCount(0);
  await expect(page.getByTestId("bordro-kpis")).toBeVisible();
  await expect(page.getByTestId("bordro-table")).toBeVisible();
  await expect(page.getByTestId("bordro-total")).toBeVisible();
  await expect(page.getByTestId("bordro-payboxes")).toBeVisible();
}

/* ── 1) BY · aylık bordro (dolu) ─────────────────────────────────────────── */

test("aylik bordro gorsel", async ({ page }) => {
  // Kadraj YILI: 2026 — mutasyon yılı (2025) ve oransız yıl (2024) dışarıda.
  await pinPayrollPeriods(page, (row) => row.year === 2026);
  await login(page);
  await page.goto("/bordro");

  await expect(page.getByRole("heading", { level: 1, name: "Bordro Yönetimi" })).toBeVisible();
  // Varsayılan dönem = kronolojik SON (mockup'ın çizdiği ay, BY:52).
  await expectMonthlyNavigatorLoaded(page, "Temmuz 2026");
  await expectMonthlyDetailLoaded(page);

  // Dört KPI kartının dördü de GERÇEK sayı bastı ("—" = pending zarfı).
  await expect(page.getByTestId("bordro-kpis")).not.toContainText("—");

  // 🔴 K3 · BEŞ SATIR DURUMUNDAN ÜÇÜ bu karede birden görünür: `pending`
  // (şirket/serbest/stajyer), `excluded` (taşeron — K2) ve `uncomputed`
  // (ücreti tanımsız personel). Rozetler `data-line-status`tan doğrulanır ki
  // iddia etikete değil VERİYE bağlansın.
  await expect(page.getByTestId("bordro-line-pl-2026-07-1")).toHaveAttribute(
    "data-line-status",
    "pending",
  );
  await expect(page.getByTestId("bordro-line-pl-2026-07-3")).toHaveAttribute(
    "data-line-status",
    "excluded",
  );
  await expect(page.getByTestId("bordro-line-pl-2026-07-5")).toHaveAttribute(
    "data-line-status",
    "uncomputed",
  );

  // K3 uyarı bantları: hesaplanamayan satır + ödemeye girmeyen taşeron satırı
  // GÖRÜNÜR. Oran seti 2026'da tanımlı olduğu için maliyet bandı YOKTUR.
  await expect(page.getByTestId("bordro-uncomputed-band")).toBeVisible();
  await expect(page.getByTestId("bordro-excluded-band")).toBeVisible();
  await expect(page.getByTestId("bordro-unknown-cost-band")).toHaveCount(0);

  // K11 · uçsuz iki düğme devre-dışı + GÖRÜNÜR gerekçe (kutular basılır).
  await expect(page.getByTestId("bordro-paybox-bank-reason")).toBeVisible();
  await expect(page.getByTestId("bordro-paybox-cash-reason")).toBeVisible();

  // 🔴 F-BORDRO T2/T3 — başlığın İKİ yeni denetimi kadrajda. 2026-07
  // `pending_approval`dır ⇒ hesap kapısı AÇIKTIR (kilit `approved`/`paid`te).
  await expect(page.getByTestId("bordro-open-period")).toBeEnabled();
  await expect(page.getByTestId("bordro-compute")).toBeEnabled();
  // 🔴 FDA:134 — Temmuz 2026'nın SATIRLARI var ⇒ etiket `Yeniden Hesapla`dır.
  // Kanıt DOM'dan alınır, kareden DEĞİL (görsel kapı metin geçişlerini
  // eşiğin altında yutabilir).
  await expect(page.getByTestId("bordro-compute")).toHaveText("Yeniden Hesapla");

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("bordro-aylik.png", { fullPage: true });
});

/* ── 2) BY · hiç dönem YOK (K3 onaylı sapması) ───────────────────────────── */

test("aylik bordro (donem yok) gorsel", async ({ page }) => {
  // BOŞ DURUM KAYNAĞI (`leaves-visual.spec.ts` emsali): paylaşılan mock
  // DURUMU boşaltılmaz — kardeş baseline'ları ve `bordro.spec.ts`in yazma
  // adasını kırardı. Yerine TEK GET yanıtı boş zarfla karşılanır.
  await pinPayrollPeriods(page, () => false);
  await login(page);
  await page.goto("/bordro");

  await expect(page.getByRole("heading", { level: 1, name: "Bordro Yönetimi" })).toBeVisible();
  await expect(page.getByTestId("bordro-loaded")).toBeAttached();

  // 🔴 F-BORDRO T2 — KARAR TERSİNE ÇEVRİLDİ. Bu kare eskiden "dönem aç düğmesi
  // ÇİZİLMEZ" hâlini gömüyordu ve o hâl kullanıcının bildirdiği kusurun
  // ta kendisiydi (boş modülden çıkış yolu yok). Artık boş durumun bir ÇIKIŞ
  // YOLU sunması bekçilenir. Ay gezgini yine boş etikete düşer, uydurma ay
  // basmaz.
  await expect(page.getByTestId("bordro-empty")).toBeVisible();
  await expect(page.getByTestId("bordro-open-period")).toBeEnabled();
  // Hesap düğmesi dönem YOKKEN kapalıdır ve gerekçesi kadrajda okunur.
  await expect(page.getByTestId("bordro-compute")).toBeDisabled();
  await expect(page.getByTestId("bordro-table")).toHaveCount(0);
  await expect(page.getByTestId("bordro-kpis")).toHaveCount(0);
  await expect(page.getByTestId(MONTHLY_LOADING)).toHaveCount(0);
  await expect(page.getByTestId("bordro-error")).toHaveCount(0);
  await expect(page.getByTestId("bordro-periods-error")).toHaveCount(0);

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("bordro-aylik-bos.png", { fullPage: true });
});

/* ── 3) BY · ORAN SETİ YOK (K3 · fail-closed) ────────────────────────────── */

test("aylik bordro (oran seti yok) gorsel", async ({ page }) => {
  // 🔴 2024'ün oran seti sahte backend'de BİLİNÇLİ OLARAK yoktur: bordro
  // fail-closed'dur ve oransız yıl hesaplanmaz. `IK3-SEED` inene kadar
  // CANLIDA görülecek hâl budur — kare bu yüzden vardır.
  await pinPayrollPeriods(page, (row) => row.year === 2024);
  await login(page);
  await page.goto("/bordro");

  await expect(page.getByRole("heading", { level: 1, name: "Bordro Yönetimi" })).toBeVisible();
  await expectMonthlyNavigatorLoaded(page, "Aralık 2024");
  await expectMonthlyDetailLoaded(page);

  // Ödenebilir satır KALMADI: hesaplanamayan satır bandı ve maliyet bandı
  // birlikte görünür — kullanıcı sıfırları "gerçek" sanamaz.
  await expect(page.getByTestId("bordro-uncomputed-band")).toBeVisible();
  await expect(page.getByTestId("bordro-unknown-cost-band")).toBeVisible();
  await expect(page.getByTestId("bordro-line-pl-2024-12-1")).toHaveAttribute(
    "data-line-status",
    "uncomputed",
  );
  // Taşeron satırı oransız yılda da ÖDEMEYE GİRMEZ (K2 kaynağa bağlıdır,
  // tutara değil).
  await expect(page.getByTestId("bordro-line-pl-2024-12-3")).toHaveAttribute(
    "data-line-status",
    "excluded",
  );

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("bordro-aylik-oransiz.png", { fullPage: true });
});

/* ── 4) BG · bordro geçmişi ──────────────────────────────────────────────── */

test("bordro gecmisi gorsel", async ({ page }) => {
  await login(page);
  await page.goto("/bordro/gecmis");

  await expect(page.getByRole("heading", { level: 1, name: "Bordro Geçmişi" })).toBeVisible();
  await expect(page.getByTestId("bordro-gecmis-loaded")).toBeAttached();
  await expect(page.getByTestId(HISTORY_LOADING)).toHaveCount(0);
  await expect(page.getByTestId("bordro-gecmis-error")).toHaveCount(0);
  await expect(page.getByTestId("bordro-gecmis-empty")).toHaveCount(0);
  await expect(page.getByTestId("bordro-gecmis-truncation")).toHaveCount(0);

  // K6 · yıl süzgeci veriden türer ve varsayılan EN YENİ yıldır.
  await expect(page.getByTestId("bordro-gecmis-year")).toHaveValue("2026");

  // Tablo + tfoot. 🔴 K4: tfoot etiketindeki ay sayısı SATIRLARDAN türer
  // (mockup "7 Ay" derken beş satır çiziyordu); 2026'da beş dönem var.
  await expect(page.getByTestId("bordro-gecmis-table")).toBeVisible();
  await expect(page.getByTestId("bordro-gecmis-row-pp-2026-07")).toBeVisible();
  await expect(page.getByTestId("bordro-gecmis-row-pp-2026-03")).toBeVisible();
  // Başka yılın satırı seçili yılın tablosuna SIZMAZ (istemci süzgeci tuttu).
  await expect(page.getByTestId("bordro-gecmis-row-pp-2025-12")).toHaveCount(0);
  await expect(page.getByTestId("bordro-gecmis-total-label")).toContainText("5 Ay");
  await expect(page.getByTestId("bordro-gecmis-total")).not.toContainText("—");
  // Toplamlar EKSİKSİZ: ayrıştırılamayan para alanı bandı basılmadı.
  await expect(page.getByTestId("bordro-gecmis-unparsed-band")).toHaveCount(0);

  // K3 · dönem durumlarının üçü bu tabloda birden görünür.
  await expect(page.getByTestId("bordro-gecmis-status-pp-2026-03")).toHaveText("Ödendi");
  await expect(page.getByTestId("bordro-gecmis-status-pp-2026-06")).toHaveText("Onaylandı");
  await expect(page.getByTestId("bordro-gecmis-status-pp-2026-07")).toHaveText("Onay Bekliyor");

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("bordro-gecmis.png", { fullPage: true });
});

/* ── 6) 🔴 F-BORDRO T2 · "Dönem Aç" diyaloğu (YENİ KARE) ─────────────────── */

/**
 * 🔴 ONAYLI SAPMA — bu diyaloğun MOCKUP'I YOKTUR; kanonik form modalı
 * kabuğundan türetildi (gerekçe `PayrollPeriodFormModal.tsx` başlığında).
 * Kare tam da bu yüzden vardır: türetilmiş bir yüzeyin görsel kapısı
 * olmasaydı, sonraki her değişiklik onu sessizce kaydırabilirdi.
 *
 * 📅 TARİH BAĞIMSIZ: açılış değerleri `new Date()`ten DEĞİL, VERİDEN türer
 * (`nextPeriodSuggestion` — en yeni dönem 2026-07 ⇒ öneri Ağustos 2026).
 * İstemci takvimi okunsaydı bu kare her ay kendiliğinden çürürdü.
 */
test("donem ac diyalogu gorsel", async ({ page }) => {
  await pinPayrollPeriods(page, (row) => row.year === 2026);
  await login(page);
  await page.goto("/bordro");

  await expect(page.getByRole("heading", { level: 1, name: "Bordro Yönetimi" })).toBeVisible();
  await expectMonthlyNavigatorLoaded(page, "Temmuz 2026");
  await expectMonthlyDetailLoaded(page);

  await page.getByTestId("bordro-open-period").click();

  const dialog = page.getByRole("dialog", { name: "Bordro Dönemi Aç" });
  await expect(dialog).toBeVisible();

  // Diyalog OTURDU: iki türev alan da DOLU basılı (öneri veriden çözüldü) ve
  // kapı açık — boş/engelli hâl kadraja donmamalıdır.
  await expect(page.getByTestId("bordro-open-year")).toHaveValue("2026");
  await expect(page.getByTestId("bordro-open-month")).toHaveValue("8");
  await expect(page.getByTestId("bordro-open-submit")).toBeEnabled();
  await expect(page.getByTestId("bordro-open-block-reason")).toHaveCount(0);
  await expect(page.getByTestId("bordro-open-error")).toHaveCount(0);

  // 🔴 F-BORDONEM · FDA:55 + FDA:85-92 — kadraja giren İKİ yeni yüzey
  // DURUM-TABANLI iddiayla doğrulanır. Kare bunları sessizce kaybederse
  // (bir refactor kutuyu düşürür) baseline yine "yeşil bir kare" olurdu;
  // görsel spec'in 1. parçası tam bunun için var.
  await expect(page.getByTestId("bordro-open-step")).toHaveText("Adım 1 / 2");
  await expect(page.getByTestId("bordro-open-notice")).toContainText(
    "Bu adımda satırlar oluşmaz",
  );

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("bordro-donem-ac.png", { fullPage: true });
});

/* ── 5) SGK · e-Bildirge ─────────────────────────────────────────────────── */

test("sgk bildirimi gorsel", async ({ page }) => {
  await pinPayrollPeriods(page, (row) => row.year === 2026);
  await login(page);
  await page.goto("/bordro/sgk");

  await expect(page.getByRole("heading", { level: 1, name: "SGK e-Bildirge" })).toBeVisible();

  // KAYNAK A · dönem listesi (gezgin).
  await expect(page.getByTestId("bordro-sgk-period-label")).toHaveText("Temmuz 2026");
  await expect(page.getByTestId("bordro-sgk-periods-error")).toHaveCount(0);
  await expect(page.getByTestId("bordro-sgk-truncation")).toHaveCount(0);

  // KAYNAK B · SGK özeti (KPI dörtlüsü + prim tablosu + ödenecek prim).
  await expect(page.getByTestId("bordro-sgk-loaded")).toBeAttached();
  await expect(page.getByTestId(SGK_LOADING)).toHaveCount(0);
  await expect(page.getByTestId("bordro-sgk-error")).toHaveCount(0);
  await expect(page.getByTestId("bordro-sgk-empty")).toHaveCount(0);
  await expect(page.getByTestId("bordro-sgk-kpis")).not.toContainText("—");
  await expect(page.getByTestId("bordro-sgk-premium")).toBeVisible();
  await expect(page.getByTestId("bordro-sgk-payable-value")).not.toHaveText("—");

  // 🔴🔴 K2 · KISA ÇALIŞMA SATIRI ÇİZİLMEZ. Kare bunu tek başına
  // kanıtlayamaz (satırın YOKLUĞU bir piksel farkı değil, bir eksikliktir),
  // bu yüzden DOM'dan iddia edilir: işveren sütununda TAM İKİ kalem vardır.
  await expect(page.getByTestId("bordro-sgk-employer-sgk-employer")).toBeVisible();
  await expect(page.getByTestId("bordro-sgk-employer-unemployment-employer")).toBeVisible();
  await expect(page.getByTestId("bordro-sgk-employer-short-work")).toHaveCount(0);
  await expect(page.getByTestId("bordro-sgk-premium")).not.toContainText("Kısa Çalışma");

  // K11 · XML ucu YOK ve çalışan listesi BASILMAZ — ikisi de GÖRÜNÜR gerekçeyle.
  await expect(page.getByTestId("bordro-sgk-xml-reason")).toBeVisible();
  await expect(page.getByTestId("bordro-sgk-personnel-omitted")).toBeVisible();

  // Damga hâli: 2026-07 henüz gönderilmedi ⇒ gönderim düğmesi kadrajda.
  await expect(page.getByTestId("bordro-sgk-status-badge")).toHaveText("Gönderilmedi");
  await expect(page.getByTestId("bordro-sgk-submit")).toBeVisible();

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("bordro-sgk.png", { fullPage: true });
});
