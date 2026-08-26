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
  await expect(page.getByTestId("fin-add")).toBeEnabled();

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
  // 🔴 Kadrajın ASIL kanıtı: seri no sütunu bu sekmede "Senet No" başlığını
  // taşır (E10 bu tabloyu çizmez; kusur YALNIZ kareye bakılarak bulunmuştu).
  await expect(page.getByTestId("fin-table").getByRole("columnheader").first()).toHaveText(
    "Senet No",
  );

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("cek-senet-senetler.png", { fullPage: true });
});

// ---------------------------------------------------------------------------
// 3) 🟢 F-CEK · FCE — "Yeni Çek / Senet" formu (mockup geldi, düğme açıldı)
// ---------------------------------------------------------------------------
//
// 🔴 Bu kare YENİDİR ve baseline turu İSTER. Kadraj `fullPage`tir: modal
// yapışkan şeridin ALTINDA kalan bir eleman kadrajında KIRPILIRDI.
//
// 🔒 SALT-OKUR kalır: form AÇILIR ama GÖNDERİLMEZ — gönderim başka bir
// dosyanın işidir (`financial-instruments-form.spec.ts`) ve mock zaten
// listeyi mutasyona uğratmaz.
test("cek senet yeni cek formu gorsel", async ({ page }) => {
  await page.setViewportSize({ ...VISUAL_VIEWPORT });
  await openInstruments(page);

  await page.getByTestId("fin-add").click();
  await expect(page.getByRole("dialog", { name: "Yeni Çek / Senet" })).toBeVisible();

  // 🔴 Kadraja giren yüzeyler DURUM-TABANLI iddiayla doğrulanır (görsel spec
  // 1. parça): bir refactor kutuyu düşürürse kare yine "yeşil" olurdu.
  await expect(page.getByTestId("fin-form-lead")).toHaveText("Kayıt portföye eklenir");
  await expect(page.getByTestId("fin-form-composition")).toHaveText("ALINAN ÇEK");
  await expect(page.getByTestId("fin-form-status-note")).toContainText("Durum alanı yok");
  // Boş formda kapı KAPALI ve gerekçesi footer'da okunur (FCE:196).
  await expect(page.getByTestId("fin-form-submit")).toBeDisabled();
  await expect(page.getByTestId("fin-form-block-reason")).toBeVisible();
  // İki opsiyonel seçicinin kaynağı da İNDİ — "Yükleniyor" hâli donmasın.
  await expect(page.getByTestId("fin-form-project").locator("option")).not.toHaveCount(1);
  await expect(page.getByTestId("fin-form-bank-account").locator("option")).not.toHaveCount(1);

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("cek-senet-yeni-cek-formu.png", { fullPage: true });
});
