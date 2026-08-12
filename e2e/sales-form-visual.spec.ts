import { test, expect, type Page } from "@playwright/test";

import { prepareFrame } from "./visual-scroll";

// F-P8 T4 · DS (`/satis/yeni`) Yeni Satış formu — VARSAYILAN görsel kadrajı.
// Mockup `Form - Daire Satisi.dc.html`. `stock-entry-visual.spec.ts` /
// `personnel-form-visual.spec.ts` deseninin aynısı.
//
// SALT-OKUR: form yalnız AÇILIR, GÖNDERİLMEZ — hiçbir POST/PUT tetiklenmez.
// Proje/ünite/müşteri listeleri GERÇEK sunucudan gelir (yazma yok → paylaşılan
// durum değişmez, T4 baseline'ları güvende).
//
// ⏱️ SAAT SABİTLEME GEREKMEZ (T4 uyarısı KARARI): varsayılan form durumunda
// bugüne bağlı HİÇBİR alan yoktur — `emptySaleFormValues()` (form-state.ts)
// `firstInstallmentDate` · `plannedDeedDate` · `deliveryDate` alanlarının
// hepsini `""` döndürür ve sales/sales-form kodunda `new Date()`/`isoDate`
// türevi yoktur. Plan tablosu da HENÜZ üretilmediğinden (default = boş plan)
// tarih basan satır yoktur. Dolayısıyla `page.clock` KURULMAZ; kadraj tarihe
// göre kaymaz (kıyas: `stock-entry-visual.spec.ts`te "Giriş Tarihi" bugünle
// dolduğu için clock ZORUNLUYDU).
//
// Baseline `.png` YALNIZ Linux CI'da üretilir (visual-baselines.yml →
// workflow_dispatch → artifact → `e2e/`); macOS'ta koşturulup commit edilmez.

const FORM_URL = "/satis/yeni";

async function login(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

test("daire satisi formu (varsayilan) gorsel", async ({ page }) => {
  await login(page);
  await page.goto(FORM_URL);
  await expect(page.getByRole("heading", { name: "Yeni Satış Kaydı", level: 1 })).toBeVisible();

  // YERLEŞİM OTURDU (WORKFLOW §4, 1. parça):
  // (a) proje listesi GELDİ → seçim devre dışı DEĞİL (yükleme durumunda
  //     `projectsDisabled` seçimi kilitler),
  await expect(page.getByTestId("satis-form-proje")).toBeEnabled();
  // (b) varsayılan "yeni müşteri" satır-içi alanları görünür (customerMode
  //     default = "new"),
  await expect(page.getByTestId("satis-form-alici-ad")).toBeVisible();
  // (c) plan HENÜZ üretilmedi → boş-plan notu basılı, plan tablosu YOK.
  await expect(page.getByTestId("satis-form-plan-bos")).toBeVisible();
  await expect(page.getByTestId("satis-form-plan-tablo")).toHaveCount(0);

  // Kadraj hazırlığı (kaydırma sıfırlama + imleç parkı): `visual-scroll.ts`.
  await prepareFrame(page);
  await expect(page).toHaveScreenshot("daire-satisi-formu.png", { fullPage: true });
});
