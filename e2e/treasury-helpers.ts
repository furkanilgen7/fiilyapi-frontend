import { expect, type Page } from "@playwright/test";

// F-HZ T3 · Hazine (E9) e2e'lerinin ORTAK yardımcıları
// (`equipment-helpers.ts` deseninin aynısı).
//
// ⚠️ Bu dosya `*.spec.ts` DEĞİLDİR; Playwright onu test dosyası olarak
// toplamaz, yalnız import edilir. `prepareFrame` BURADAN RE-EXPORT EDİLMEZ:
// görsel kadraj bekçisi (`src/test-guards/visual-frame-guard.test.ts`) yalnız
// `from "./visual-scroll"` yazan spec'leri tarar — kanonu dolaylı almak
// spec'i bekçinin kapsamından ÇIKARIRDI.

/** Görsel kadrajların ORTAK penceresi — mevcut görsel spec'lerle aynı. */
export const VISUAL_VIEWPORT = { width: 1440, height: 900 } as const;

export const TREASURY_URL = "/hazine";

/**
 * 📅 TARİH BAĞIMSIZLIĞI: `/hazine` dönemi URL'den OKUMAZ ve istemci saatine
 * HİÇ dokunmaz — dönem başlığı `CashFlowResponse.year/month` echo'sundan,
 * "N gün kaldı" `days_remaining`ten, "(7 Gün)" başlığı `days` echo'sundan
 * gelir. Fikstür bu alanları SABİT verdiği için kare makinenin takvimine
 * bağlı değildir; `page.clock` gerekmez (kod okunarak doğrulandı — T3.1).
 */

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
