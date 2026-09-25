import { test, expect, type Page } from "@playwright/test";

import {
  ACTIVE_SITE_ID,
  COMPLETED_SITE_ID,
  PLANNING_PANEL_VIEWPORT,
  login,
  openPlanningPanel,
} from "./earned-value-helpers";
import { prepareFrame } from "./visual-scroll";

// PLN-F3.6b · `Planlama - Panel` (PNL) görsel kadrajları.
// Kanonik mockup: `projedesign/Planlama - Panel.dc.html`.
//
// 🔴 BAŞLIK KURALI: her testin adında "gorsel" GEÇER (5. kapı `--grep-invert`
// ile BAŞLIĞA göre süzer).
//
// 🔒 SALT-OKUR: hiçbir kadraj YAZMAZ. Açılır/popover yok; disiplin süzgeci
// gerçek bir navigasyondur (`?disiplin=` — `openPlanningPanel` parametresi),
// popover TIKLANMAZ.
//
// 📅 SAAT ÇAKILIDIR (`login` içinde, NAVİGASYONDAN ÖNCE): `?tarih=`
// verilmezse `panel-url-state.ts::todayIso()` `new Date()`ten türer
// (Europe/Istanbul takvim günü) — FIXED_NOW = 2026-09-24T06:00:00Z →
// İstanbul'da 24.09.2026 (panel-fixtures.ts `day(0)` ile AYNI gün).
//
// SENARYOLAR (`e2e/mock-backend.ts` `evReportsRoute::evPanelScenario`):
// `?scenario=no-baseline` → `has_baseline:false` (a) · `?scenario=no-field-data`
// → `has_baseline:true,has_field_data:false` (b) · `?scenario=error` → 500 ·
// `?discipline_id=` GERÇEKTEN filtreler (kök + soyu, S8 mantığıyla aynı).
// Ekran `scenario`yu backend'e İLETMEZ (URL'de yalnız `?tarih&aralik&disiplin&
// yuklenici` vardır) — hata/baseline-yok/veri-yok kareleri `page.route` ile
// istek URL'sine `scenario=` EKLEYEREK alınır (mock'u DEĞİŞTİRMEDEN, protokol
// §"Sentinel sözleşmesi" notu).
//
// Baseline `.png` YALNIZ Linux CI'da üretilir; macOS'ta commit edilmez.

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ ...PLANNING_PANEL_VIEWPORT });
  await login(page);
});

/** Panel GET isteğine `?scenario=` ekler — mock'u DEĞİŞTİRMEDEN hâl seçer. */
async function withPanelScenario(page: Page, scenario: string) {
  await page.route("**/api/backend/sites/*/earned-value/panel*", async (route) => {
    const url = new URL(route.request().url());
    url.searchParams.set("scenario", scenario);
    const response = await route.fetch({ url: url.toString() });
    await route.fulfill({ response });
  });
}

// ---------------------------------------------------------------------------
// 1) Panel:79-448 · Ana ekran — toolbar + 6 KPI + S-eğrisi + uyarılar +
//    3 grafik + disiplin tablosu (A-Blok, dolu veri)
// ---------------------------------------------------------------------------
test("planlama paneli ana ekran gorsel", async ({ page }) => {
  await openPlanningPanel(page, { siteId: ACTIVE_SITE_ID });
  await expect(page.getByRole("list", { name: "Planlama Paneli özet göstergeleri" })).toBeVisible();
  await expect(page.getByRole("img", { name: "S-eğrisi, kümülatif ilerleme" })).toBeVisible();
  await expect(page.getByRole("table", { name: "Disiplin tablosu" })).toBeVisible();
  await expect(page.getByText("Uyarılar")).toBeVisible();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("planlama-paneli-ana.png", { fullPage: true });
});

// ---------------------------------------------------------------------------
// 2) Panel:348-396 · Disiplin filtreli — `?disiplin=d:KAB` (Kaba İnşaat),
//    tablo yalnız Kaba İnşaat + "Beton döküm" satırlarını basar
// ---------------------------------------------------------------------------
test("planlama paneli disiplin filtreli gorsel", async ({ page }) => {
  await openPlanningPanel(page, { siteId: ACTIVE_SITE_ID, disciplineId: "d:KAB" });
  await expect(page.getByRole("combobox", { name: "Disiplin" })).toHaveValue("d:KAB");
  await expect(page.getByRole("table", { name: "Disiplin tablosu" }).getByText("Kaba İnşaat")).toBeVisible();
  await expect(page.getByRole("table", { name: "Disiplin tablosu" }).getByText("Duvar & Sıva")).toHaveCount(0);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("planlama-paneli-disiplin-filtreli.png", { fullPage: true });
});

// ---------------------------------------------------------------------------
// 3) Panel:401-409 · (a) Baseline yok — kesikli çerçeve, "Adam-Saat
//    Bütçesi'ne git" düğmesi; KPI/grafik/tablo BASILMAZ
// ---------------------------------------------------------------------------
test("planlama paneli baseline yok gorsel", async ({ page }) => {
  await withPanelScenario(page, "no-baseline");
  await openPlanningPanel(page, { siteId: ACTIVE_SITE_ID });
  await expect(page.getByText("Henüz baseline yok")).toBeVisible();
  // Sidebar'da da "Adam-Saat Bütçesi" bağlantısı var (regex iki eşleşme
  // bulurdu) — düğme adı TAM METİNLE ayrıştırılır.
  await expect(page.getByRole("link", { name: "Adam-Saat Bütçesi'ne git" })).toBeVisible();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("planlama-paneli-baseline-yok.png", { fullPage: true });
});

// ---------------------------------------------------------------------------
// 4) Panel:410-423 · (b) Baseline var, sahadan veri yok — iki mini KPI "–",
//    yalnız planlı (kesikli) S-eğrisi + "Bugün" çizgisi
// ---------------------------------------------------------------------------
test("planlama paneli veri yok gorsel", async ({ page }) => {
  await withPanelScenario(page, "no-field-data");
  await openPlanningPanel(page, { siteId: ACTIVE_SITE_ID });
  await expect(page.getByText("İlk günlük gönderildiğinde gerçek eğri ve PF hesaplanır.")).toBeVisible();
  await expect(page.getByRole("img", { name: "Yalnız planlı S-eğrisi" })).toBeVisible();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("planlama-paneli-veri-yok.png", { fullPage: true });
});

// ---------------------------------------------------------------------------
// 5) Panel:424-431 · Hata — ErrorCard "Panel verisi alınamadı" + "Tekrar dene"
// ---------------------------------------------------------------------------
test("planlama paneli hata gorsel", async ({ page }) => {
  await withPanelScenario(page, "error");
  await openPlanningPanel(page, { siteId: ACTIVE_SITE_ID });
  await expect(page.getByText("Panel verisi alınamadı")).toBeVisible();
  await expect(page.getByRole("button", { name: "Tekrar dene" })).toBeVisible();

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("planlama-paneli-hata.png", { fullPage: true });
});

// ---------------------------------------------------------------------------
// 6) Panel:440 · Salt okunur — B-Blok (tamamlanmış şantiye), ReadOnlyStrip
//    "Görüntüleyici · yalnız okuma", KPI 6 "Dağıt →" BASILMAZ
// ---------------------------------------------------------------------------
test("planlama paneli salt okunur gorsel", async ({ page }) => {
  await openPlanningPanel(page, { siteId: COMPLETED_SITE_ID });
  await expect(page.getByText("Görüntüleyici · yalnız okuma")).toBeVisible();
  await expect(page.getByRole("link", { name: "Dağıt →" })).toHaveCount(0);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("planlama-paneli-salt-okunur.png", { fullPage: true });
});

// ---------------------------------------------------------------------------
// 7) Panel:321-345 · Histogram ipucu SAYILI — gezginin gününün haftasındaki
//    (H21, "21.09–27.09") çubuğun ipucu. `PanelHistogramChart.tsx`:
//    `shownIndex = hover ?? geo.bars.indexOf(geo.today)` — S-eğrisinin
//    "durağan Bugün" kanonuyla AYNI desen (`man-hour-budget-visual.spec.ts`
//    CEO notu n): fare üstünde DEĞİLKEN bile `geo.today` bandının ipucu
//    DURAĞAN basılıdır. `prepareFrame`in imleç parkı GERÇEK bir hover'ı
//    kapatırdı (bu yüzden depoda fareyle açılan bir ipucunun kareye
//    girdiği başka bir spec YOK — aynı dosyanın "İpucu... kareye GİREMEZ"
//    notu); bu kare o kısıtı GEREKTİRMEZ çünkü basılan ipucu zaten
//    STATİKTİR — gezginin GÜNÜ (24.09, H21) `geo.today`nin ta kendisidir.
//    ELEMAN kadrajı (`fullPage` DEĞİL): yalnız histogram kartı basılır.
// ---------------------------------------------------------------------------
test("planlama paneli histogram ipucu gorsel", async ({ page }) => {
  await openPlanningPanel(page, { siteId: ACTIVE_SITE_ID });
  const histogram = page.getByRole("img", { name: "Haftalık işçi histogramı" });
  await expect(histogram).toBeVisible();

  // Dört grafiğin DÖRDÜ de durağan varsayılan ipucu basar (S-eğrisi/günlük
  // çubuk/PF trendi/histogram) — `.chart-tooltip__title` sayfada TEKİL
  // DEĞİLDİR, bu yüzden histogram kartına ("Gerçekleşen (puantaj)" satırını
  // taşıyan TEK grafik) göre daralt.
  const histogramCard = page.locator(".ev-panel-chart-head", { has: histogram });
  const actualRow = histogramCard.locator(".chart-tooltip__row", { hasText: "Gerçekleşen (puantaj)" });
  await expect(actualRow.locator(".chart-tooltip__value")).toHaveText(/^\d+ kişi$/);
  await expect(histogramCard.locator(".chart-tooltip__title")).toContainText("H21");

  await prepareFrame(page);
  await expect(histogramCard).toHaveScreenshot("planlama-paneli-histogram-ipucu.png");
});
