/**
 * F-DATE T0 ölçüm aracı — `<input type="date">` biçiminin KÖK NEDENİ.
 *
 * Neden var: "tarih alanları neden `mm/dd/yyyy` basıyor, `lang="tr"` neden
 * düzeltmiyor?" sorusu teoriyle değil ÖLÇÜMLE cevaplanmalıydı. Bu betik dört
 * yapılandırmayı yan yana koyar ve kareyi diske yazar; iddia PNG'lerin
 * karşılaştırılmasıyla doğrulanır, açıklamayla değil.
 *
 * ÖLÇÜLEN SONUÇ (chromium, 2026-08-23):
 *   default (UI dili en-US) ............ 07/19/2026   yükseklik 42px
 *   newContext({ locale: "tr-TR" }) .... 07/19/2026   ← BAYT BAYT AYNI KARE
 *   launch({ args: ["--lang=tr-TR"] }) . 19.07.2026   yükseklik 42px
 *
 * ÇIKARIM: biçim YALNIZCA tarayıcının ARAYÜZ DİLİNE bağlıdır. `document.lang`,
 * `Intl` varsayılanı ve `Accept-Language` (Playwright `locale` seçeneği bu
 * ikisini ayarlar) biçimi DEĞİŞTİRMEZ. Arayüz dili bir işletim sistemi/tarayıcı
 * ayarıdır — web uygulamasının ona erişimi YOKTUR. Yani native kontrol
 * kullanıldığı sürece tarih biçimi uygulama tarafından belirlenemez.
 *
 * İKİNCİ ÖLÇÜM: `type="date"` 42px, `type="text"` 40px — AYNI CSS altında.
 * 2px fark Chromium'un tarih gölge-DOM'undan gelir, token'lardan değil.
 *
 * Koşturma: `node scripts/date-locale-probe.mjs` (çıktılar /tmp'ye yazılır).
 */
import { chromium } from "@playwright/test";
import { tmpdir } from "node:os";
import path from "node:path";

// Ölçüm, `.input` kuralının tarih alanını saran gerçek bildirimlerini taklit
// eder (bkz. src/components/ui/input/input.css) — çıplak px yalnız BURADA,
// ölçüm sabiti olarak durur; ürün kodu token kullanır.
const css = `.probe{width:100%;font:13px/20px system-ui;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:8px;}`;
const html = `<!doctype html><html lang="tr"><head><style>${css}</style></head><body style="margin:0">
<div style="width:212px"><input class="probe" id="date" type="date" value="2026-07-19"></div>
<div style="width:212px"><input class="probe" id="text" type="text" value="19.07.2026"></div>
</body></html>`;

async function probe(label, launchOptions, contextOptions) {
  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  await page.setContent(html);
  const file = path.join(tmpdir(), `fdate-probe-${label}.png`);
  await page.locator("#date").screenshot({ path: file });
  const heights = await page.evaluate(() => ({
    date: document.getElementById("date").getBoundingClientRect().height,
    text: document.getElementById("text").getBoundingClientRect().height,
  }));
  const locales = await page.evaluate(() => [
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().locale,
  ]);
  console.log(
    `${label.padEnd(18)} date=${heights.date}px text=${heights.text}px ` +
      `navigator.language=${locales[0]} Intl=${locales[1]}  → ${file}`,
  );
  await browser.close();
}

await probe("default", {}, {});
await probe("ctx-locale-tr", {}, { locale: "tr-TR" });
await probe("launch-lang-tr", { args: ["--lang=tr-TR"] }, {});
console.log(
  "\nKareleri KARŞILAŞTIR: default ile ctx-locale-tr AYNI olmalı; " +
    "launch-lang-tr FARKLI (19.07.2026).",
);
