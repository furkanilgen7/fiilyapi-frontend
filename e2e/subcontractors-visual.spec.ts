import { test, expect } from "@playwright/test";

import { login, prepareFrame } from "./contracts-visual-helpers";

// F-P5 T8 · TL (`/sozlesmeler/taseronlar`) görsel testi. Kanon: projedesign
// `Taşeron Listesi.dc.html`.
//
// 📅 SAAT SABİTLEME: "Bu Ay Ödenen" KPI'ı istemcide `new Date()` ile süzülür
// (`SubcontractorsView` → `buildSubcontractorDirectory`) ve ekranda dönemi
// veren bir URL parametresi YOKTUR. Fikstürler 2026-08 hakedişleri taşır, yani
// baseline ay değişince KENDİLİĞİNDEN kırmızıya dönerdi (F-PL/F-PT'nin `?week=`
// / `?year=&month=` sabitlemesinin bu ekrandaki karşılığı). Bu yüzden saat
// `page.clock.setFixedTime` ile fikstür ayına çakılır — oturum açıldıktan
// SONRA, kimlik/çerez akışına dokunmadan.
//
// ⚠️ `.tl` kökünde `animation: var(--anim-fade-up)` vardır → kadrajdan ÖNCE
// durum-tabanlı iddia (WORKFLOW §4). Tıklama YOKTUR: arama/kategori süzgeçleri
// kullanılmaz, kadraj SÜZÜLMEMİŞ listeyi basar.
//
// 🔒 FİKSTÜR İZOLASYONU: bu dosya HİÇBİR kayda dokunmaz — "+ Taşeron Ekle"
// modalı AÇILMAZ, POST atılmaz. Okuduğu üç uç (`/subcontractors`,
// `/contracts?type=subcontractor`, `/subcontractor-progress-payments`) koşu
// boyunca mutasyona uğramaz: fonksiyonel spec'lerin mutasyona uğrattığı
// hakedişler (`scpp-6`, `scpp-7`) `hiddenFromLists: true` ile liste uçlarından
// zaten dışlanır.
//
// `tl-orphan-notice` fikstürde GÖRÜNÜRDÜR (sc-3 hiçbir firmayla eşleşmez) —
// kadrajda BEKLENEN öğedir, gizlenmez.
//
// Baseline `.png` YALNIZ Linux CI'da üretilir; macOS'ta commit edilmez.

/** Fikstür hakedişlerinin ayı (2026-08) içinde sabit bir an. */
const FIXTURE_NOW = new Date("2026-08-15T09:00:00.000Z");

test("taseron listesi gorsel", async ({ page }) => {
  await login(page);
  await page.clock.setFixedTime(FIXTURE_NOW);
  await page.goto("/sozlesmeler/taseronlar");

  await expect(page.getByRole("heading", { level: 1, name: "Taşeron Listesi" })).toBeVisible();
  // Yerleşim oturdu: KPI şeridi + gerçek satırlar + "—" düşen PUAN hücresi
  // basıldı; para KPI'ı kırpılma yüzünden PENDING'e DÜŞMEDİ.
  await expect(page.getByTestId("tl-kpi-strip")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Çelik İnşaat Taah." })).toBeVisible();
  await expect(page.getByTestId("tl-rating-pending").first()).toBeVisible();
  await expect(page.getByTestId("tl-truncation-notice")).toHaveCount(0);
  await expect(page.getByTestId("tl-kpi-month-payment")).not.toHaveText("—");
  // Yetim sözleşme uyarısı fikstürde vardır ve kadraja GİRER.
  await expect(page.getByTestId("tl-orphan-notice")).toBeVisible();

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("taseron-listesi.png", { fullPage: true });
});
