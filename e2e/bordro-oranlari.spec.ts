import { test, expect } from "@playwright/test";

import {
  EMPTY_YEAR,
  VISUAL_YEAR,
  login,
  openPayrollRates,
  selectYear,
} from "./bordro-oranlari-helpers";

// F-BORORAN · `Ayarlar > Bordro Oranları` FONKSİYONEL e2e'si.
//
// 🔒 SALT-OKUR: bu dosya hiçbir yazma ucu ÇAĞIRMAZ. Kopyalama İSTEMCİ
// TARAFIDIR (`POST …/copy` ucu YOKTUR) ve sunucuya hiç dokunmaz — bu yüzden
// `fullyParallel` altında hiçbir karenin durumunu oynatamaz. Yazma denemeleri
// `bordro-oranlari-api.spec.ts`tedir ve yalnız `WRITE_YEAR`e yazarlar.

test("ayarlar menusunden erisilir ve ekran acilir", async ({ page }) => {
  await login(page);
  await page.goto("/ayarlar");
  await page.getByRole("link", { name: /Bordro Oranları/ }).click();
  await expect(page).toHaveURL(/\/ayarlar\/bordro-oranlari$/);
  await expect(page.getByRole("heading", { level: 1, name: "Bordro Oranları" })).toBeVisible();
});

test("dort bordro tipi sekmesi vardir; Genel Isci YOKTUR", async ({ page }) => {
  await login(page);
  await openPayrollRates(page);
  for (const label of ["Şirket Kadrosu", "Taşeron İşçisi", "Serbest Meslek", "Stajyer"]) {
    await expect(page.getByRole("tab", { name: new RegExp(label) })).toBeVisible();
  }
  await expect(page.getByRole("tab", { name: /Genel İşçi/ })).toHaveCount(0);
});

test("2026 yili KILITLIDIR: kaydet dugmeleri yok, gerekce gorunur", async ({ page }) => {
  await login(page);
  await openPayrollRates(page);
  await expect(page.getByTestId("bro-locked")).toContainText("onaylanmış veya ödenmiş");
  await expect(page.getByTestId("bro-save-rates")).toHaveCount(0);
  await expect(page.getByTestId("bro-save-brackets")).toHaveCount(0);
  await expect(page.getByLabel("SGK Primi işçi payı")).toHaveAttribute("readonly", "");
});

test("TAM KUME yazma uyarisi tarife kartinda GORUNUR", async ({ page }) => {
  await login(page);
  await openPayrollRates(page);
  await expect(page.getByTestId("bro-full-set-warning")).toContainText(
    "tarifenin TAMAMINI değiştirir",
  );
});

test("bos yil secilebilir ve BOS HAL gosterilir", async ({ page }) => {
  await login(page);
  await openPayrollRates(page);
  await selectYear(page, EMPTY_YEAR);
  await expect(page.getByTestId("bro-empty")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: `${EMPTY_YEAR} oranları henüz girilmemiş` }),
  ).toBeVisible();
});

test("KOPYALA formu doldurur ve 'kaydedilmedi' der (sunucuya yazmaz)", async ({ page }) => {
  await login(page);
  await openPayrollRates(page);
  await selectYear(page, EMPTY_YEAR);
  await page.getByTestId("bro-empty-copy").click();

  await expect(page.getByTestId("bro-copied")).toContainText("henüz KAYDEDİLMEDİ");
  await expect(page.getByLabel("SGK Primi işçi payı")).toHaveValue("14.000");
  await expect(page.getByLabel("1. dilim üst sınırı")).toHaveValue("190000.00");
  // 🔴 Kopyalama YAZMA DEĞİLDİR: sunucudaki 2027 hâlâ BOŞTUR.
  const rates = await page.request.get("/api/backend/payroll/rates");
  const items = (await rates.json()).items as { year: number }[];
  expect(items.filter((r) => r.year === EMPTY_YEAR)).toEqual([]);
});

test("kopyalanan yil DUZENLENEBILIRDIR (donemi yok, kilit yok)", async ({ page }) => {
  await login(page);
  await openPayrollRates(page);
  await selectYear(page, EMPTY_YEAR);
  await page.getByTestId("bro-empty-copy").click();
  await expect(page.getByTestId("bro-locked")).toHaveCount(0);
  await expect(page.getByTestId("bro-save-rates")).toBeVisible();
  await expect(page.getByTestId("bro-save-brackets")).toBeVisible();
});

test("istemci korkulugu sozlesme disi orani SUNUCUYA GONDERMEZ", async ({ page }) => {
  await login(page);
  await openPayrollRates(page);
  await selectYear(page, EMPTY_YEAR);
  await page.getByTestId("bro-empty-copy").click();

  const input = page.getByLabel("SGK Primi işçi payı");
  await input.fill("101");
  await page.getByTestId("bro-save-rates").click();
  await expect(page.getByTestId("bro-rate-error")).toContainText("en fazla 100");

  // Sunucuya HİÇ gitmedi: 2027 hâlâ boş.
  const rates = await page.request.get("/api/backend/payroll/rates");
  const items = (await rates.json()).items as { year: number }[];
  expect(items.filter((r) => r.year === EMPTY_YEAR)).toEqual([]);
});

/**
 * 🔴 NOTUN YÖNÜ — mockup `:172` *"Dilim tablosu yoksa bu sabit oran
 * kullanılır"* yazar; ÖLÇÜM bunun TERSİNİ söylüyor
 * (`payroll/models.py:367`): **`NULL` = DİLİMLİ MOTOR, dolu = DÜZ ORAN.**
 * Ekran bu yüzden mockup'ın cümlesini DEĞİL, ölçülen kuralı basar.
 *
 * ⚠️ Fikstürde 2026 şirket kadrosunun `income_tax_pct` değeri `"15.000"`tir
 * (sahte backend `PAYROLL_RATE_SEEDS`), oysa GERÇEK backend tohumu aynı satır
 * için `NULL` basar (`rate_seed_data.PAYROLL_RATES_2026`). Bu bir F-BORORAN
 * kusuru DEĞİL, F-BOR fikstürünün backend'den sapmasıdır ve DÜZELTİLMEDİ:
 * sahte bordro motorunun dilimli rejimi yoktur, `NULL`a çevirmek üç bordro
 * karesini birden oynatırdı (KAPSAM DIŞI, raporda kayıtlı). `NULL`ın boş kutu
 * + "Dilimli tarife" olarak basıldığı `PayrollRatesScreen.test.tsx`te ölçülür.
 */
test("gelir vergisi orani notu DILIMLI REJIMI dogru yonde anlatir", async ({ page }) => {
  await login(page);
  await openPayrollRates(page);
  await expect(page.getByLabel("Gelir Vergisi Oranı")).toHaveValue("15.000");
  await expect(
    page.getByText(/Boş bırakılırsa aşağıdaki gelir vergisi DİLİMLERİ kullanılır/),
  ).toBeVisible();
  await expect(
    page.getByText(/Bir değer yazılırsa dilimler devre dışı kalır/),
  ).toBeVisible();
});

test("ucret disi tarifesi TOHUMLANMAMISTIR: bos durum basar, uydurulmaz", async ({ page }) => {
  await login(page);
  await openPayrollRates(page);
  await page.getByRole("tab", { name: "Ücret Dışı" }).click();
  await expect(page.getByTestId("bro-brackets")).toContainText("tarife girilmemiş");
  await expect(page.getByText(`${VISUAL_YEAR} · Ücret Dışı için tarife girilmemiş`)).toBeVisible();
});
