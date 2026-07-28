import { test, expect } from "@playwright/test";

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
    await expect(el).toHaveScreenshot(`${id}.png`, { maxDiffPixelRatio: 0.01 });
  });
}
