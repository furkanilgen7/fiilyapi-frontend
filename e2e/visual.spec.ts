import { test, expect } from "@playwright/test";

import { prepareFrame } from "./visual-scroll";

test.beforeEach(async ({ page }) => {
  // F-ST T1 (onaylı görsel borç) — kadraj penceresi AÇIKÇA kurulur; bkz.
  // `login-visual.spec.ts` notu (config varsayılanı 1280×900, kanon 1440×900).
  // Kadrajlar ELEMAN kadrajıdır ama sayfa genişliği primitive'lerin sarmasını
  // etkiler, bu yüzden pencere burada da sabitlenir.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/design-system");
  // Fontlarin yuklenmesini bekle (deterministik snapshot icin)
  await page.evaluate(() => document.fonts.ready);
});

const sections = [
  "section-buttons",
  "section-inputs",
  "section-fields",
  "section-controls",
  "section-badges",
  "section-alerts",
  "section-cards",
  // F-DATE: sayfanin SONUNDA — altinda kimse kalmasin diye (page.tsx notu).
  "section-date-input",
];

for (const id of sections) {
  test(`gorsel: ${id}`, async ({ page }) => {
    const el = page.getByTestId(id);

    // Kadraj hazırlığı (kaydırma sıfırlama + imleç parkı): `visual-scroll.ts`.
    await prepareFrame(page);
    await expect(el).toHaveScreenshot(`${id}.png`, { maxDiffPixelRatio: 0.01 });
  });
}
