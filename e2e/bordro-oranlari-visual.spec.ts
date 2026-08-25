import { test, expect } from "@playwright/test";

import {
  EMPTY_YEAR,
  VISUAL_VIEWPORT,
  login,
  openPayrollRates,
  selectYear,
} from "./bordro-oranlari-helpers";
import { prepareFrame } from "./visual-scroll";

// F-BORORAN · `Ayarlar - Bordro Oranları` görsel kadrajları.
// Kanonik mockup: `projedesign/Ayarlar - Bordro Oranları.dc.html`.
//
// 🔴 BAŞLIK KURALI: her testin adında "gorsel" GEÇER (5. kapı `--grep-invert`
// ile BAŞLIĞA göre süzer).
//
// 🔴 NEDEN ELEMAN KADRAJI (`fullPage` DEĞİL): Ayarlar kenar çubuğu ZATEN on
// `settings-visual` karesinde basılıdır; bu ekranın kendi yüzeyi `.bro-wrap`a
// sığar ve kenar çubuğunun tekrarı üç kareyi birden gereksizce büyütürdü.
//
// 🔒 SALT-OKUR: bu dosya hiçbir mutasyon TETİKLEMEZ. "Kopyala" bir yazma
// DEĞİLDİR (istemci tarafı, `POST …/copy` ucu yoktur), bu yüzden 3. kare de
// paylaşılan mock durumuna dokunmaz — `bordro-oranlari-api.spec.ts` ile
// `fullyParallel` altında yapısal olarak yarışsızdır (o dosya YALNIZ 2023'e
// yazar; 2023 hiçbir kadraja girmez ve seçenek listesinde ZATEN vardır).
//
// 📅 SAAT ÇAKILIDIR (`login` içinde, NAVİGASYONDAN ÖNCE): yıl seçeneklerinin
// kümesi `new Date().getFullYear()`ten türer; dondurulmadan üç kare de takvim
// 2027'ye döndüğü gün oynardı.
//
// Baseline `.png` YALNIZ Linux CI'da üretilir; macOS'ta commit edilmez.

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ ...VISUAL_VIEWPORT });
  await login(page);
});

// ---------------------------------------------------------------------------
// 1) :86-221 · dolu yıl — tip sekmeleri + oran tablosu + dilim tarifesi
//    ⚠️ 2026'da `approved`/`paid` dönem VARDIR, yani yıl KİLİTLİDİR ve kare
//    salt-okunur hâli basar. Bu bir eksiklik değil, ÖLÇÜLMÜŞ GERÇEKTİR:
//    mockup 2026'yı düzenlenebilir çizer ama sözleşme o yılda 409 döner.
// ---------------------------------------------------------------------------
test("ayarlar bordro oranlari dolu yil gorsel", async ({ page }) => {
  await openPayrollRates(page);
  const wrap = page.getByTestId("bro-wrap");
  await expect(wrap).toBeVisible();

  await prepareFrame(page);
  await expect(wrap).toHaveScreenshot("ayarlar-bordro-oranlari-dolu.png");
});

// ---------------------------------------------------------------------------
// 2) :224-241 · BOŞ HÂL — oranı hiç girilmemiş yıl (2027)
// ---------------------------------------------------------------------------
test("ayarlar bordro oranlari bos yil gorsel", async ({ page }) => {
  await openPayrollRates(page);
  await selectYear(page, EMPTY_YEAR);
  const bos = page.getByTestId("bro-empty");
  await expect(bos).toBeVisible();

  await prepareFrame(page);
  await expect(page.getByTestId("bro-wrap")).toHaveScreenshot(
    "ayarlar-bordro-oranlari-bos.png",
  );
});

// ---------------------------------------------------------------------------
// 3) :131-140 + :143-221 · KOPYALANMIŞ hâl — düzenlenebilir tablo + "henüz
//    kaydedilmedi" şeridi. Mockup'ın DÜZENLENEBİLİR tablosunun tek kanıtı
//    budur (2026 kilitli olduğu için 1. kare salt-okunurdur).
// ---------------------------------------------------------------------------
test("ayarlar bordro oranlari kopyalanmis yil gorsel", async ({ page }) => {
  await openPayrollRates(page);
  await selectYear(page, EMPTY_YEAR);
  await page.getByTestId("bro-empty-copy").click();
  // Yerleşim OTURDU iddiası: kopya indi, kilit yok, kaydet düğmesi canlı.
  await expect(page.getByTestId("bro-copied")).toBeVisible();
  await expect(page.getByLabel("SGK Primi işçi payı")).toHaveValue("14.000");
  await expect(page.getByTestId("bro-save-rates")).toBeVisible();
  await expect(page.getByTestId("bro-locked")).toHaveCount(0);

  await prepareFrame(page);
  await expect(page.getByTestId("bro-wrap")).toHaveScreenshot(
    "ayarlar-bordro-oranlari-kopya.png",
  );
});
