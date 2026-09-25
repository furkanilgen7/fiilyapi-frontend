import { test, expect } from "@playwright/test";

import { ACTIVE_SITE_ID, VISUAL_VIEWPORT, login } from "./earned-value-helpers";

// PLN-F3.6b · Rapor ekranlarının ETKİLEŞİM e2e'leri (GÖRSEL DEĞİL — kadraj
// almaz). Üç akış:
//   1) GİR onay akışı — düğme → modal → POST → rozet "Onaylandı".
//   2) QURR Excel indir — download olayı + dosya adı.
//   3) Kök ikiz `?site=` korunumu — QURR → GİR bağlantısı.
//
// SENARYOLAR (`e2e/mock-backend.ts` `evReportsRoute`):
//   · GİR onay: `date=2026-09-27` — LİDER TALEBİYLE eklenen, onay düğmesi
//     ETKİN tek gün (diğer üç fikstürün (22/24/25.09) hiçbirinde düğme aktif
//     DEĞİL, S10 gereği `draft_diary_dates` dolu). `2026-09-26` C'nin onay
//     MODALI karesidir, BU SPEC'TE POST EDİLMEZ (paylaşılan `evDailyApprovals`
//     durumunu C'nin görsel karesiyle KARIŞTIRMAMAK için).
//   · QURR Excel: varsayılan (süzgeçsiz) hafta — `has_field_data:true`,
//     "Excel indir" düğmesi ETKİN.
//
// 📅 SAAT ÇAKILIDIR (`login` içinde, NAVİGASYONDAN ÖNCE) — kanon gereği
// (`playwright-screenshot-threshold` bu dosyayı TARAMAZ, kadraj YOK, ama
// `login` zaten her EV testinin ortak girişidir).

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ ...VISUAL_VIEWPORT });
  await login(page);
});

// ---------------------------------------------------------------------------
// 1) GİR:389-403 · Onay akışı — "Onayla ve kilitle" → modal → POST →
//    rozet "Onaylandı — Sercan Öztürk"
// ---------------------------------------------------------------------------
test("gunluk ilerleme raporu onay akisi", async ({ page }) => {
  await page.goto(`/planlama/gunluk-rapor?site=${ACTIVE_SITE_ID}&tarih=2026-09-27`);
  await expect(page.locator(".ev-daily-head__name")).toHaveText("Günlük İlerleme Raporu");

  const openButton = page.getByRole("button", { name: "Onayla ve kilitle" });
  await expect(openButton).toBeEnabled();
  await openButton.click();

  const dialog = page.getByRole("dialog", { name: "Raporu onayla ve kilitle" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Onayla ve kilitle" }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText(/^Onaylandı — Sercan Öztürk/)).toBeVisible();
  // Onaylı raporda "Onayla ve kilitle" düğmesi artık BASILMAZ (salt okunur).
  await expect(page.getByRole("button", { name: "Onayla ve kilitle" })).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// 2) QURR:372-373 · Excel indir — download olayı + dosya adı `QURR-H<hafta>.xlsx`
// ---------------------------------------------------------------------------
test("haftalik qurr excel indir", async ({ page }) => {
  await page.goto(`/planlama/haftalik-qurr?site=${ACTIVE_SITE_ID}`);
  await expect(page.getByRole("heading", { level: 1, name: "Haftalık Miktar & Birim Oran Raporu" })).toBeVisible();

  const excelButton = page.getByRole("button", { name: "Excel indir" });
  await expect(excelButton).toBeEnabled();

  const [download] = await Promise.all([page.waitForEvent("download"), excelButton.click()]);
  expect(download.suggestedFilename()).toMatch(/^QURR-H\d+\.xlsx$/);
});

// ---------------------------------------------------------------------------
// 3) QURR:511-516 · Kök ikiz `?site=` korunumu — "Günlük İlerleme Raporu →"
//    bağlantısı seçili şantiyeyi TAŞIR (F3.6a lider denetimi düzeltmesinin
//    regresyon bekçisi: `buildGeneralReportLinks` kök ikizde bağlamı
//    düşürmüşse GİR İLK seçeneğe döner, başka bir şantiye görünür).
// ---------------------------------------------------------------------------
test("kok ikiz site korunumu qurr'dan gir'e", async ({ page }) => {
  await page.goto(`/planlama/haftalik-qurr?site=${ACTIVE_SITE_ID}`);
  const dailyReportLink = page.getByRole("link", { name: "Günlük İlerleme Raporu →" });
  await expect(dailyReportLink).toBeVisible();
  await expect(dailyReportLink).toHaveAttribute("href", new RegExp(`[?&]site=${ACTIVE_SITE_ID}(&|$)`));

  await dailyReportLink.click();
  await expect(page.locator(".ev-daily-head__name")).toHaveText("Günlük İlerleme Raporu");
  const url = new URL(page.url());
  expect(url.searchParams.get("site")).toBe(ACTIVE_SITE_ID);
  // Şantiye bağlamı gerçekten TAŞINDI mı — A-Blok Şantiyesi'nin kırıntısı
  // (breadcrumb) görünür, kök ikiz PICKER'IN VARSAYILANINA dönmedi.
  await expect(page.locator(".ev-daily-head__eyebrow")).toContainText("A-Blok Şantiyesi");
});
