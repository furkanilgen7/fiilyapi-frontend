import { expect, type Page } from "@playwright/test";

// F-OKROL · `Ayarlar - Onay Rolleri ve Eşik` e2e'lerinin ORTAK yardımcıları.
//
// ⚠️ Bu dosya `*.spec.ts` DEĞİLDİR; `prepareFrame` BURADAN RE-EXPORT EDİLMEZ
// (görsel kadraj bekçisi yalnız `from "./visual-scroll"` yazan spec'leri tarar).

export const VISUAL_VIEWPORT = { width: 1440, height: 900 } as const;

export const APPROVAL_ROLES_URL = "/ayarlar/onay-rolleri";

/**
 * 🔒 YAZMA HEDEFİ — `mock-backend.ts`teki `APPROVAL_ROLE_WRITE_TARGET`.
 * `state.users`ta YOKTUR ve `GET /approvals/roles` onu YAPISAL olarak dışlar:
 * hiçbir kare bu kullanıcıyı görmez, dolayısıyla yazma testi hiçbir
 * baseline'ı oynatamaz (F-OK `hiddenFromLists` deseni).
 */
export const WRITE_TARGET_USER_ID = "u-okrol-write";

export async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

/**
 * Ekranı açar ve DÖRT BAĞIMSIZ KAYNAĞIN da indiğini doğrular (WORKFLOW §4
 * "GÖRSEL SPEC KURALI" 1. + 5. parça). Ekranı `GET /users` · `GET /roles` ·
 * `GET /approvals/roles` · `GET /approvals/settings` besliyor; tek bayrak
 * beklemek ötekilerin hâlâ pending olduğunu GİZLERDİ ve kadraj yarım bir
 * tabloyu donmuş yakalayabilirdi.
 */
export async function openApprovalRoles(page: Page) {
  await page.goto(APPROVAL_ROLES_URL);
  await expect(page.getByRole("heading", { level: 1, name: "Onay Rolleri ve Eşik" })).toBeVisible();
  // (1) `GET /users` — katalogdan gelen satır.
  await expect(page.locator(".okr-table").getByText("Yusuf Kaya", { exact: true })).toBeVisible();
  // (2) `GET /roles` — sistem rolü rozeti (onay rolü DEĞİL).
  await expect(page.locator(".okr-table .role-pill", { hasText: "Şantiye Şefi" }).first()).toBeVisible();
  // (3) `GET /approvals/roles` — atama BİNDİRİLMİŞ (Ahmet Yılmaz üç rollü).
  await expect(
    page.getByRole("button", { name: "Patron", pressed: true }).first(),
  ).toBeVisible();
  // (4) `GET /approvals/settings` — eşik şeridi.
  await expect(page.getByText("₺500.000 ve üstü")).toBeVisible();
  await expect(page.getByText("Yükleniyor…")).toHaveCount(0);
}
