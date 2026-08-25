import { expect, type Page } from "@playwright/test";

// F-BORORAN · `Ayarlar - Bordro Oranları` e2e'lerinin ORTAK yardımcıları.
//
// ⚠️ Bu dosya `*.spec.ts` DEĞİLDİR; `prepareFrame` BURADAN RE-EXPORT EDİLMEZ.

export const VISUAL_VIEWPORT = { width: 1440, height: 900 } as const;
export const PAYROLL_RATES_URL = "/ayarlar/bordro-oranlari";

/**
 * 📅 SAAT ÇAKILIR — `page.clock` ZORUNLU (`leaves-visual.spec.ts` emsali).
 * Ekran `new Date().getFullYear()` okur ve o değer ÜÇ yüzeyi birden sürer:
 * (a) varsayılan yıl, (b) yıl seçeneklerinin kümesi (`bu yıl` + `gelecek yıl`),
 * (c) "gelecek yıl girilmedi" uyarı şeridi. Takvim 2027'ye döndüğü an
 * seçenekler 2028'i kazanır ve ÜÇ KARE BİRDEN oynardı.
 */
export const FIXED_NOW = "2026-08-16T09:00:00Z";

/** Fikstürün oran/tarife taşıyan GÖRSEL yılı (mutasyon YASAK). */
export const VISUAL_YEAR = 2026;
/** Fikstürde HİÇ verisi olmayan yıl — mockup'ın "boş hâl" hikâyesi. */
export const EMPTY_YEAR = 2027;
/**
 * 🔒 YAZMA ALANI — `PAYROLL_RATE_YEARS`e F-BORORAN'ın eklediği yıl.
 * Dönemi YOKTUR (yıl kilidi yok) ve HİÇBİR kare onu basmaz; seçenek
 * listesinde ZATEN olduğu için yazma hiçbir baseline'ı oynatmaz.
 */
export const WRITE_YEAR = 2023;

export async function login(page: Page) {
  await page.clock.setFixedTime(new Date(FIXED_NOW));
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

/**
 * Ekranı açar ve ÜÇ BAĞIMSIZ KAYNAĞIN da indiğini doğrular (GÖRSEL SPEC
 * KURALI 1. + 5. parça). Ekranı `GET /payroll/rates` ·
 * `GET /payroll/tax-brackets` · `GET /payroll/periods` besliyor; tek bayrak
 * beklemek ötekilerin hâlâ pending olduğunu GİZLERDİ.
 */
export async function openPayrollRates(page: Page) {
  await page.goto(PAYROLL_RATES_URL);
  await expect(page.getByRole("heading", { level: 1, name: "Bordro Oranları" })).toBeVisible();
  // (1) `GET /payroll/rates` — oran kutusu doldu.
  await expect(page.getByLabel("SGK Primi işçi payı")).toHaveValue("14.000");
  // (2) `GET /payroll/tax-brackets` — tarife satırı basıldı.
  await expect(page.getByLabel("1. dilim üst sınırı")).toHaveValue("190000.00");
  // (3) `GET /payroll/periods` — yıl kilidi ŞERİDİ (2026'da onaylı dönem var).
  await expect(page.getByTestId("bro-locked")).toBeVisible();
  await expect(page.getByText("Yükleniyor…")).toHaveCount(0);
}

/** Yıl seçicisini değiştirir ve seçimin OTURDUĞUNU doğrular. */
export async function selectYear(page: Page, year: number) {
  await page.getByTestId("bro-year").selectOption(String(year));
  await expect(page.getByTestId("bro-year")).toHaveValue(String(year));
}
