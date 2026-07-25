// Renders a projedesign mockup HTML to a PNG for side-by-side comparison.
// Usage: node scripts/render-mockup.mjs "<abs-or-rel html path>" "<out png>" [width]
import { chromium } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const [, , htmlArg, outArg, widthArg] = process.argv;
if (!htmlArg || !outArg) {
  console.error("usage: node scripts/render-mockup.mjs <html> <out.png> [width]");
  process.exit(1);
}
const width = Number(widthArg ?? 1440);
const url = pathToFileURL(resolve(htmlArg)).href;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 1000 } });
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await page.screenshot({ path: resolve(outArg), fullPage: true });
await browser.close();
console.log("wrote", resolve(outArg));
