import { test, expect } from "@playwright/test";

import { prepareFrame } from "./visual-scroll";
import {
  expectTimelineLoaded,
  FIXED_NOW,
  login,
  pinEmptyPortfolio,
  pinTimeline,
  TIMELINE_URL,
} from "./takvim-helpers";

/**
 * F-TKV T8 — Proje Takvimi görsel kadrajları (mockup `Proje Takvimi.dc.html`).
 * ÜÇÜ DE SALT-OKUNURDUR; hiçbiri paylaşılan mock state'i mutasyona uğratmaz.
 *
 * GÖRÜNÜM ANAHTARI TIKLANMAZ, URL'DEN AÇILIR: zoom durumu `?gorunum=` ile
 * paylaşılabilir olduğu için yıllık kadraj doğrudan o adrese gidilerek alınır.
 * Böylece "tıklama + fullPage" birleşimi (kaydırma kayması tuzağı, F-P10/F-PL
 * dersi) bu dosyada HİÇ oluşmaz.
 *
 * 🔴 TARİH DETERMİNİZMİ İKİ KAYNAKLIDIR ve ikisi de sabitlenir:
 *  - Bugün çizgisi + "Yaklaşan Teslimat" SUNUCU damgasından gelir
 *    (`ProjectTimelineResponse.today` = 2026-07-17). `page.clock` bunu
 *    ETKİLEMEZ, mock sabit döndürdüğü için zaten deterministiktir.
 *  - Kabuk/oturum katmanı istemci saatine bakabildiği için `setFixedTime` yine
 *    de kurulur. GİRİŞTEN SONRA çağrılır: `leaves-visual.spec.ts` ölçümü,
 *    girişten önce çağrıldığında giriş akışının hiç tamamlanmadığını gösterdi.
 *
 * Baseline `.png` YALNIZ Linux CI'da üretilir (visual-baselines.yml →
 * workflow_dispatch); macOS'ta koşturulup commit EDİLMEZ.
 */

test("takvim aylik gorsel", async ({ page }) => {
  await login(page);
  await pinTimeline(page);
  await page.clock.setFixedTime(new Date(FIXED_NOW));
  await page.goto(TIMELINE_URL);
  await expectTimelineLoaded(page);
  await expect(page.getByTestId("tkv-column")).toHaveCount(51);
  await expect(page.getByTestId("tkv-milestone")).toHaveCount(3);
  await expect(page.getByTestId("tkv-today-line")).toHaveCount(1);

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("takvim-aylik.png", { fullPage: true });
});

test("takvim yillik gorsel", async ({ page }) => {
  await login(page);
  await pinTimeline(page);
  await page.clock.setFixedTime(new Date(FIXED_NOW));
  await page.goto(`${TIMELINE_URL}?gorunum=yillik`);
  await expectTimelineLoaded(page);
  await expect(page.getByTestId("tkv-zoom-yearly")).toHaveAttribute("aria-current", "true");
  await expect(page.getByTestId("tkv-column")).toHaveCount(5);

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("takvim-yillik.png", { fullPage: true });
});

test("takvim bos gorsel", async ({ page }) => {
  await login(page);
  await page.clock.setFixedTime(new Date(FIXED_NOW));
  await pinEmptyPortfolio(page);
  await page.goto(TIMELINE_URL);
  // Boş portföy hâli OTURDU: ızgara yok, özet şeridi var, yükleme metni yok.
  await expect(page.getByTestId("tkv-empty")).toContainText("Portföyde proje yok");
  await expect(page.getByTestId("tkv-total-contract")).toHaveText("—");
  await expect(page.getByText("Yükleniyor…")).toHaveCount(0);

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("takvim-bos.png", { fullPage: true });
});
