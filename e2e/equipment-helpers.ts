import { expect, type Page } from "@playwright/test";

// F-MK T5b · Makine & Ekipman e2e'lerinin ORTAK yardımcıları
// (`purchasing-visual-helpers.ts` deseninin aynısı).
//
// ⚠️ Bu dosya `*.spec.ts` DEĞİLDİR; Playwright onu test dosyası olarak
// toplamaz, yalnız import edilir. `prepareFrame` BURADAN RE-EXPORT EDİLMEZ:
// görsel kadraj bekçisi (`src/test-guards/visual-frame-guard.test.ts`) yalnız
// `from "./visual-scroll"` yazan spec'leri tarar — kanonu dolaylı almak
// spec'i bekçinin kapsamından ÇIKARIRDI.

/** Görsel kadrajların ORTAK penceresi — mevcut görsel spec'lerle aynı. */
export const VISUAL_VIEWPORT = { width: 1440, height: 900 } as const;

export const EQUIPMENT_URL = "/makine";
export const EQUIPMENT_NEW_URL = "/makine/yeni";

/**
 * 📅 TARİH BAĞIMSIZLIĞI: `/makine/calisma` ve `/makine/yakit` dönemi URL'den
 * okur ve parametre yoksa **İÇİNDE BULUNULAN AYA** düşer (`parsePeriod`).
 * Fikstürler 2026-08'de yaşadığı için her iki ekran da dönemi AÇIKÇA taşır —
 * aksi hâlde testler makinenin takvimine bağlı olurdu ve bir ay sonra boş
 * ekran basarlardı (`page.clock`a gerek kalmadan çözülen tek sınıf).
 */
export const EQUIPMENT_PERIOD_QUERY = "year=2026&month=8";
export const EQUIPMENT_WORK_URL = `/makine/calisma?${EQUIPMENT_PERIOD_QUERY}`;
export const EQUIPMENT_FUEL_URL = `/makine/yakit?${EQUIPMENT_PERIOD_QUERY}`;

export async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

/** Görsel kadrajların girişi — pencereyi ORTAK ölçüye çeker, sonra girer. */
export async function visualLogin(page: Page) {
  await page.setViewportSize({ ...VISUAL_VIEWPORT });
  await login(page);
}
