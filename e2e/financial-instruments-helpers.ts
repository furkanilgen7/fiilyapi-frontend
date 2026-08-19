import { expect, type Page } from "@playwright/test";

// F-FIN · Çek & Senet (E10) e2e'lerinin ORTAK yardımcıları
// (`treasury-helpers.ts` deseninin aynısı).
//
// ⚠️ Bu dosya `*.spec.ts` DEĞİLDİR; Playwright onu test dosyası olarak
// toplamaz, yalnız import edilir. `prepareFrame` BURADAN RE-EXPORT EDİLMEZ:
// görsel kadraj bekçisi (`src/test-guards/visual-frame-guard.test.ts`) yalnız
// `from "./visual-scroll"` yazan spec'leri tarar — kanonu dolaylı almak
// spec'i bekçinin kapsamından ÇIKARIRDI.

/** Görsel kadrajların ORTAK penceresi — mevcut görsel spec'lerle aynı. */
export const VISUAL_VIEWPORT = { width: 1440, height: 900 } as const;

export const INSTRUMENTS_URL = "/hazine/cek-senet";

/**
 * 📅 TARİH BAĞIMSIZLIĞI: ekran istemci saatine HİÇ dokunmaz. Vade/keşide
 * tarihleri uçtan gelen ISO alanlardır, "Vadede" rozeti sunucunun ürettiği
 * `is_due` TÜREVİNDEN gelir ve mock fikstürde DONMUŞTUR. Bu yüzden kadrajlar
 * makinenin takvimine bağlı değildir ve `page.clock` GEREKMEZ (kod okunarak
 * doğrulandı; `useFinancialInstruments` hiçbir yerde `new Date()` çağırmaz).
 */

export async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

/**
 * Ekranı açar ve İKİ BAĞIMSIZ KAYNAĞIN da indiğini doğrular (WORKFLOW §4
 * "GÖRSEL SPEC KURALI" 1. + 5. parça): özet kartları ve liste AYRI
 * sorgulardır; tek bayrak beklemek ötekinin hâlâ "Yükleniyor…" olduğunu
 * GİZLERDİ ve kadraj o donmuş hâli yakalayabilirdi.
 */
export async function openInstruments(page: Page, tab?: "verilen" | "senet") {
  await page.goto(tab === undefined ? INSTRUMENTS_URL : `${INSTRUMENTS_URL}?sekme=${tab}`);
  await expect(page.getByRole("heading", { level: 1, name: "Çek & Ödeme" })).toBeVisible();
  await expect(page.getByTestId("fin-loaded-summary")).toBeAttached();
  await expect(page.getByTestId("fin-loaded-list")).toBeAttached();
  await expect(page.getByText(/yükleniyor/i)).toHaveCount(0);
}

/** Görsel kadrajların girişi — pencereyi ORTAK ölçüye çeker, sonra girer. */
export async function visualLogin(page: Page) {
  await page.setViewportSize({ ...VISUAL_VIEWPORT });
  await login(page);
}
