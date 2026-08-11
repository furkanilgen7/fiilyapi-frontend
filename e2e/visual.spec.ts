import { test, expect } from "@playwright/test";

import { prepareFrame } from "./visual-scroll";

test.beforeEach(async ({ page }) => {
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
];

for (const id of sections) {
  test(`gorsel: ${id}`, async ({ page }) => {
    const el = page.getByTestId(id);

    // Kadraj hazırlığı (kaydırma sıfırlama + imleç parkı): `visual-scroll.ts`.
    await prepareFrame(page);
    await expect(el).toHaveScreenshot(`${id}.png`, { maxDiffPixelRatio: 0.01 });
  });
}
