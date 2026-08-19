import { test, expect } from "@playwright/test";

import { openInstruments, visualLogin, VISUAL_VIEWPORT } from "./financial-instruments-helpers";
import { prepareFrame } from "./visual-scroll";

// F-FIN · `/hazine/cek-senet` (E10) görsel kadrajları.
// Kanonik mockup: `projedesign/Ekran 10 - Finans Çek Ödeme.dc.html`.
//
// 🔴 BAŞLIK KURALI: her testin adında "gorsel" GEÇER. Beşinci kapı
// `--grep-invert "gorsel"` ile BAŞLIĞA göre süzer; içermeyen bir görsel test
// fonksiyonel turda baseline'sız koşar ve KIRMIZI olur.
//
// 🔴 İKİ KARE, İKİNCİSİ MOCKUP BOŞLUĞU: E10 yalnız "Alınan Çekler" sekmesinin
// tablosunu çizer. İkinci kadraj "Senetler" sekmesini basar — o sekmenin
// GERÇEKTEN ayrı bir küme döndürdüğünü ve mockup'ta çizilmeyen dördüncü
// durumun (İptal) nötr rozetle indiğini YALNIZ o kare gösterir.
//
// 🔒 SALT-OKUR: hiçbir POST/PATCH/DELETE tetiklenmez; fikstür mock backend'de
// DONMUŞ bir dizidir ve `is_due` de DONMUŞ bir ALANDIR — kare makinenin
// takvimine bağlı DEĞİLDİR (`page.clock` gerekmez, gerekçe helper'da).
//
// ⚠️ Sabit `waitForTimeout` YOKTUR; her bekleme durum tabanlıdır.
//
// Baseline `.png` YALNIZ Linux CI'da üretilir (visual-baselines.yml →
// workflow_dispatch → artifact → `e2e/`); macOS'ta koşturulup commit edilmez.

test.beforeEach(async ({ page }) => {
  await visualLogin(page);
});

// ---------------------------------------------------------------------------
// 1) E10 · Alınan Çekler — mockup'ın çizdiği hâl
// ---------------------------------------------------------------------------
test("cek senet alinan cekler gorsel", async ({ page }) => {
  await page.setViewportSize({ ...VISUAL_VIEWPORT });
  await openInstruments(page);

  // 🔴 Damga "veri geldi" der, "ekrana bastı" DEMEZ — iki kaynağın da GERÇEK
  // rakamları ayrıca ölçülür (WORKFLOW §4, 5. parça).
  await expect(page.getByTestId("fin-card-portfolio")).toContainText("₺ 3,6M");
  await expect(page.getByTestId("fin-row")).toHaveCount(5);
  await expect(page.getByTestId("fin-add")).toBeDisabled();

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("cek-senet-alinan.png", { fullPage: true });
});

// ---------------------------------------------------------------------------
// 2) E10:96 · Senetler sekmesi — mockup boşluğu (tablosu çizilmemiş)
// ---------------------------------------------------------------------------
test("cek senet senetler sekmesi gorsel", async ({ page }) => {
  await page.setViewportSize({ ...VISUAL_VIEWPORT });
  await openInstruments(page, "senet");

  await expect(page.getByTestId("fin-tab-senet")).toHaveAttribute("aria-current", "page");
  await expect(page.getByTestId("fin-row")).toHaveCount(2);
  await expect(page.getByTestId("fin-row").nth(1).locator(".badge")).toHaveText("İptal");

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("cek-senet-senetler.png", { fullPage: true });
});
