import { test, expect } from "@playwright/test";

import { VISUAL_VIEWPORT, login, openApprovalRoles } from "./onay-rolleri-helpers";
import { prepareFrame } from "./visual-scroll";

// F-OKROL · `Ayarlar - Onay Rolleri ve Eşik` görsel kadrajları.
// Kanonik mockup: `projedesign/Ayarlar - Onay Rolleri.dc.html`.
//
// 🔴 BAŞLIK KURALI: her testin adında "gorsel" GEÇER (5. kapı `--grep-invert`
// ile BAŞLIĞA göre süzer).
//
// 🔴 NEDEN `fullPage` DEĞİL, ELEMAN KADRAJI: Ayarlar kenar çubuğu ZATEN dokuz
// `settings-visual` karesinde basılıdır; bu ekranın kendi yüzeyi iki karta
// sığar. Ayrıca `onay-rolleri-api.spec.ts` aynı mock sunucuya PUT atar —
// eleman kadrajları yalnız DEĞİŞMEYEN kayıtlara bakar (yazma hedefi
// `u-okrol-write` iki uçtan da YAPISAL olarak dışlanmıştır) ve yapısal olarak
// yarışsızdır.
//
// 🔒 SALT-OKUR: bu dosya hiçbir mutasyon tetiklemez.
//
// Baseline `.png` YALNIZ Linux CI'da üretilir; macOS'ta commit edilmez.

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ ...VISUAL_VIEWPORT });
  await login(page);
});

// ---------------------------------------------------------------------------
// 1) :136-176 · Eşik kartı — kilit rozeti, "YALNIZ YÖNETİCİ" bandı, akış şeridi
// ---------------------------------------------------------------------------
test("ayarlar onay rolleri esik karti gorsel", async ({ page }) => {
  await openApprovalRoles(page);
  const card = page.locator(".okr-card--threshold");
  await expect(card).toBeVisible();

  await prepareFrame(page);
  await expect(card).toHaveScreenshot("ayarlar-onay-rolleri-esik.png");
});

// ---------------------------------------------------------------------------
// 2) :179-224 · Kullanıcı × onay rolü tablosu (çoklu rol + devre-dışı kolon)
// ---------------------------------------------------------------------------
test("ayarlar onay rolleri tablosu gorsel", async ({ page }) => {
  await openApprovalRoles(page);
  const card = page.locator(".okr-wrap .s-card");
  await expect(card).toBeVisible();

  await prepareFrame(page);
  await expect(card).toHaveScreenshot("ayarlar-onay-rolleri-tablo.png");
});
