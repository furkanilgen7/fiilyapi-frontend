import { test, expect } from "@playwright/test";

import { visualLogin } from "./equipment-helpers";
// 🔴 `prepareFrame` DOĞRUDAN `./visual-scroll`ten ithal edilir. Yardımcı
// dosyadan re-export almak bu spec'i `src/test-guards/visual-frame-guard.
// test.ts` kapsamının DIŞINA çıkarırdı (bekçi yalnız `from "./visual-scroll"`
// yazan dosyaları tarar).
import { prepareFrame } from "./visual-scroll";

/*
 * F-KIRA · Makine Kira Hakedişi görsel kadrajları (M5 + liste).
 *
 * SALT-OKUR: bu dosya hiçbir POST/PATCH tetiklemez. Kadrajların kaynağı
 * `rental-2` ve `rental-5`tir; ikisinin de durumu HİÇBİR test tarafından
 * oynatılmaz (yazmalar `rental-3`/`rental-4`/`rental-6` üzerinde koşar).
 *
 * 🔴 LİSTE KADRAJI DÖNEME SÜZÜLÜR. Süzülmeseydi kare, durumu yazma testleri
 * tarafından oynatılan satırları da basardı ve `fullyParallel` altında
 * "Doğrulama Bekliyor" ile "Onaylandı" arasında kâh şöyle kâh böyle çıkardı —
 * hangi varyant baseline'a girerse öbürü CI'da KIRMIZI olurdu (eşik ayarı
 * yok, yani yeşil geçmesi ZAR ATMAK olurdu). Yazma fikstürlerinin hepsi
 * FARKLI aydadır; Temmuz 2026 süzgeci yalnız salt-okur `rental-2`yi bırakır.
 *
 * 📅 TARİH BAĞIMSIZ: kira ekranları dönemi URL'den değil FATURADAN okur
 * (`period_year`/`period_month` sunucu alanıdır), listede de dönem süzgeci
 * varsayılan olarak boştur → `page.clock` gerekmez.
 *
 * 🔴 "YÜKLENDİ" İDDİASI HER BAĞIMSIZ VERİ KAYNAĞINI KAPSAR (F-İK dersi):
 * her iki ekran da ÜÇ ayrı sorgudan beslenir (kira verisi + tedarikçi
 * seçenekleri + şantiye seçenekleri; şantiyeler ayrıca proje listesi üzerinden
 * paralel çözülür). Tek bayrakla beklemek ikinci/üçüncü kaynağın boş hâlini
 * kadraja DONDURABİLİRDİ.
 *
 * Baseline `.png` YALNIZ Linux CI'da üretilir (visual-baselines.yml →
 * workflow_dispatch → artifact → `e2e/`); macOS'ta koşturulup commit edilmez.
 */

const LOADING_TEXT = "Yükleniyor…";

test("makine kira hakedisi listesi gorsel", async ({ page }) => {
  await visualLogin(page);
  await page.goto("/makine/kira?period_year=2026&period_month=7");

  await expect(page.getByRole("heading", { level: 1, name: "Kira Hakedişi" })).toBeVisible();
  // (a) kira listesi · (b) tedarikçi seçenekleri · (c) şantiye seçenekleri
  await expect(page.getByTestId("makine-kira-loaded-list")).toBeAttached();
  await expect(page.getByTestId("makine-kira-loaded-suppliers")).toBeAttached();
  await expect(page.getByTestId("makine-kira-loaded-sites")).toBeAttached();
  // Süzgeç TAM OLARAK salt-okur faturayı bırakır: satır sayısı sabittir,
  // yani kare yazma testlerinin sırasından BAĞIMSIZDIR.
  await expect(page.locator("[data-rental-invoice-id]")).toHaveCount(1);
  await expect(page.locator('[data-rental-invoice-id="rental-2"]')).toBeVisible();
  await expect(page.getByText(LOADING_TEXT)).toHaveCount(0);

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("makine-kira-listesi.png", { fullPage: true });
});

test("makine kira hakedisi dogrulama ekrani gorsel", async ({ page }) => {
  await visualLogin(page);
  await page.goto("/makine/kira/rental-2");

  await expect(page.getByTestId("makine-kira-loaded-detail")).toBeAttached();
  await expect(page.getByTestId("makine-kira-loaded-suppliers")).toBeAttached();
  await expect(page.getByTestId("makine-kira-loaded-sites")).toBeAttached();

  // M5'in dört satırı ve dokuz kolonu kadrajda (K3 yırtık tablo kapandı).
  await expect(page.locator("[data-rental-line-id]")).toHaveCount(4);
  await expect(page.locator("[data-testid='makine-kira-lines'] thead th")).toHaveCount(9);
  // tfoot'un üç para satırı SUNUCU değerleriyle basılı (K9).
  await expect(page.getByTestId("makine-kira-payable")).toHaveText("₺146.995,2");
  await expect(page.getByText(LOADING_TEXT)).toHaveCount(0);

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("makine-kira-detay.png", { fullPage: true });
});

test("makine kira hakedisi fail-closed hali gorsel", async ({ page }) => {
  await visualLogin(page);
  await page.goto("/makine/kira/rental-5");

  await expect(page.getByTestId("makine-kira-loaded-detail")).toBeAttached();
  await expect(page.getByTestId("makine-kira-loaded-suppliers")).toBeAttached();
  await expect(page.getByTestId("makine-kira-loaded-sites")).toBeAttached();

  // 🔴 Bu kadrajın SEBEBİ: K8 uyarı bandı ve K9'un "hesaplanamadı" dalı
  // YALNIZ bu yükte basılır. Fikstür olmasaydı iki yüzey de hiç kadraja
  // girmez ve beş kapı yeşilken ekranda görünmez kalırlardı (eksik fikstür
  // = yeni kodu GÖRÜNMEZ bırakır, WORKFLOW §4).
  await expect(page.getByTestId("makine-kira-unknown-warning")).toBeVisible();
  await expect(page.getByTestId("makine-kira-payable-warning")).toBeVisible();
  await expect(page.getByTestId("makine-kira-dist-warning")).toBeVisible();
  await expect(page.getByText(LOADING_TEXT)).toHaveCount(0);

  await prepareFrame(page);
  await expect(page).toHaveScreenshot("makine-kira-bilinmeyen.png", { fullPage: true });
});
