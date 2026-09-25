import { test, expect } from "@playwright/test";

import {
  COMPLETED_SITE_ID,
  PLANNING_SETTINGS_VIEWPORT,
  expectPacalDefinitionsLoaded,
  login,
  openPlanningSettings,
} from "./earned-value-helpers";
import { prepareFrame } from "./visual-scroll";

// PLN-F1.7a · `Ayarlar - Planlama` (AYP) görsel kadrajları.
// Kanonik mockup: `projedesign/Ayarlar - Planlama (Ek).dc.html` (§3.10
// düzeltmeleri uygulanmış) + `Ayarlar - Planlama.dc.html`.
//
// 🔴 BAŞLIK KURALI: her testin adında "gorsel" GEÇER (5. kapı `--grep-invert`
// ile BAŞLIĞA göre süzer).
//
// 🔒 SALT-OKUR: bu dosya hiçbir YAZMA tetiklemez. Kirli form, doğrulama hatası
// ve uyarı modalı istemci durumudur; "Kaydet"e BASILMAZ — paylaşılan mock
// ayarları (`s-1`) `fullyParallel` altında başka kadrajları oynatamaz.
//
// 📅 SAAT ÇAKILIDIR (`login` içinde, NAVİGASYONDAN ÖNCE): Takvim kartının
// "şu an …" hafta ipucu `new Date()`ten türer.
//
// Baseline `.png` YALNIZ Linux CI'da üretilir; macOS'ta commit edilmez.

test.beforeEach(async ({ page }) => {
  // Kaydet çubuğu `fixed` — gerekçe `PLANNING_SETTINGS_VIEWPORT` yorumunda.
  await page.setViewportSize({ ...PLANNING_SETTINGS_VIEWPORT });
  await login(page);
});

// ---------------------------------------------------------------------------
// 1) Ek:62-230 · ana hâl — A-Blok (devam ediyor), beş kart, temiz Kaydet çubuğu
// ---------------------------------------------------------------------------
test("planlama ayarlari ana hal gorsel", async ({ page }) => {
  await openPlanningSettings(page);
  await expectPacalDefinitionsLoaded(page);
  await expect(page.getByRole("region", { name: "Kaydetme çubuğu" })).toContainText(
    "Bütün değişiklikler kaydedildi · A-Blok Şantiyesi",
  );

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("planlama-ayarlari-ana.png", { fullPage: true });
});

// ---------------------------------------------------------------------------
// 2) Ek:170-200 · günlük PF bant kutusu (üç eşik + renk şeridi + örnek işaret)
// ---------------------------------------------------------------------------
test("planlama ayarlari gunluk pf kutusu gorsel", async ({ page }) => {
  await openPlanningSettings(page);
  const box = page.getByRole("group", { name: "Günlük PF bandı" });
  await expect(box.getByLabel("Günlük şüpheli yüksek eşiği")).toHaveValue("1,05");

  await prepareFrame(page);
  await expect(box).toHaveScreenshot("planlama-ayarlari-gunluk-pf.png");
});

// ---------------------------------------------------------------------------
// 3) Ek:400-410 + :470-473 · kirli form — iki bölüm değişti, çubuk "dirty"
// ---------------------------------------------------------------------------
test("planlama ayarlari kirli form kaydet cubugu gorsel", async ({ page }) => {
  await openPlanningSettings(page);
  await expectPacalDefinitionsLoaded(page);
  await page.getByLabel("Durum toleransı (puan)").fill("2,5");
  await page.getByLabel("Günlük standart saat").fill("8,5");
  const bar = page.getByRole("region", { name: "Kaydetme çubuğu" });
  await expect(bar).toContainText("2 bölümde kaydedilmemiş değişiklik var · A-Blok Şantiyesi");
  await expect(bar.getByRole("button", { name: "Kaydet" })).toBeEnabled();

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("planlama-ayarlari-kirli.png", { fullPage: true });
});

// ---------------------------------------------------------------------------
// 4) Ek:376-398 · kaydedilmemiş değişiklik varken şantiye değiştirme modalı
// ---------------------------------------------------------------------------
test("planlama ayarlari kaydedilmemis degisiklik modali gorsel", async ({ page }) => {
  await openPlanningSettings(page);
  await page.getByLabel("Durum toleransı (puan)").fill("2,5");
  await page.getByLabel("Şantiye", { exact: true }).selectOption(COMPLETED_SITE_ID);
  const dialog = page.getByRole("dialog", { name: "Kaydedilmemiş değişiklikler var" });
  await expect(dialog).toContainText("(B-Blok Şantiyesi)");
  await expect(dialog).toContainText("Durum toleransı");

  await prepareFrame(page);
  await expect(dialog).toHaveScreenshot("planlama-ayarlari-kaydedilmemis-modal.png");
});

// ---------------------------------------------------------------------------
// 5) Ek:95-104 · tamamlanmış şantiye — salt okunur şerit, kilitli alanlar, çubuk YOK
// ---------------------------------------------------------------------------
test("planlama ayarlari tamamlanmis santiye salt okunur gorsel", async ({ page }) => {
  await openPlanningSettings(page, COMPLETED_SITE_ID);
  await expect(page.getByRole("note")).toContainText("Tamamlanmış şantiye · ayarlar salt okunur.");
  await expect(page.getByLabel("Durum toleransı (puan)")).toBeDisabled();
  await expect(page.getByRole("region", { name: "Kaydetme çubuğu" })).toHaveCount(0);

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("planlama-ayarlari-tamamlanmis-salt-okunur.png", { fullPage: true });
});

// ---------------------------------------------------------------------------
// 6) Ek:430 err1 · doğrulama hatası — günlük yeşil eşiği kırmızının ALTINDA
// ---------------------------------------------------------------------------
test("planlama ayarlari dogrulama hatasi gorsel", async ({ page }) => {
  await openPlanningSettings(page);
  await expectPacalDefinitionsLoaded(page);
  await page.getByLabel("Günlük yeşil eşiği").fill("0,90");
  const bar = page.getByRole("region", { name: "Kaydetme çubuğu" });
  await expect(bar).toContainText("Hatalı alan var · kaydetmeden önce düzeltin");
  await expect(bar.getByRole("button", { name: "Kaydet" })).toBeDisabled();

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("planlama-ayarlari-dogrulama-hatasi.png", { fullPage: true });
});
