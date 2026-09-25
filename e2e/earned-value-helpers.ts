import { expect, type Page } from "@playwright/test";

// PLN-F1.7a · Planlama (EV) e2e'lerinin ORTAK yardımcıları — `Ayarlar -
// Planlama` (AYP), `Birim Oran Kataloğu` (KAT) ve sonra yazılacak `Adam-Saat
// Bütçesi` (BÜT) görsel spec'leri buradan beslenir.
//
// ⚠️ Bu dosya `*.spec.ts` DEĞİLDİR; `prepareFrame` BURADAN RE-EXPORT EDİLMEZ
// (`bordro-oranlari-helpers.ts` emsali).
//
// Veri kaynağı: `e2e/mock-backend.ts` → "PLN-F1.7a · PLANLAMA (EARNED VALUE)
// İKİZİ" bloğu. Kimlikler orada deterministiktir.

export const VISUAL_VIEWPORT = { width: 1440, height: 900 } as const;

/**
 * AYP penceresi — genişlik ORTAK (1440), yükseklik sayfanın TAMAMINI alır.
 *
 * 🔴 ÖLÇÜLDÜ (PLN-F1.7a yerel koşu): Kaydet çubuğu `position: fixed; bottom: 0`
 * (`planning-settings.css` `.ev-save-bar`). 900px pencerede `fullPage` kadraj
 * çubuğu İLK pencerenin dibinde (y≈840) basar ve haftalık PF kartının üstünü
 * ÖRTER; sayfa ~1450px'tir. Pencere sayfadan uzun olunca çubuk gerçek yerine
 * (sayfanın dibine) oturur ve hiçbir kart örtülmez.
 */
export const PLANNING_SETTINGS_VIEWPORT = { width: 1440, height: 1600 } as const;

/**
 * 📅 SAAT ÇAKILIR — `page.clock` ZORUNLU. AYP Takvim kartındaki hafta ipucu
 * ("şu an 21.09 – 27.09") `useState(() => new Date())` ile BUGÜNDEN türer
 * (`PlanningSettingsForm.tsx`); dondurulmazsa kare her hafta değişirdi.
 * Değer mockup günüdür (24.09.2026 · Perşembe). KAT'ta tarih yeri ekranda
 * basılmaz ama aynı giriş yardımcısı kullanıldığı için o da dondurulur —
 * "savunmasız kadraj" muafiyet kaydı gerekmez.
 */
export const FIXED_NOW = "2026-09-24T06:00:00Z";

export const PLANNING_SETTINGS_URL = "/ayarlar/planlama";
export const UNIT_RATE_CATALOG_URL = "/planlama/birim-oran-katalogu";

/** Mock şantiyeleri: s-1 A-Blok (devam ediyor) · s-2 B-Blok (tamamlandı). */
export const ACTIVE_SITE_ID = "s-1";
export const COMPLETED_SITE_ID = "s-2";

/** Saat NAVİGASYONDAN ÖNCE çakılır (bekçi: `visual-frame-guard` SIRA denetimi). */
export async function login(page: Page) {
  await page.clock.setFixedTime(new Date(FIXED_NOW));
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();
}

/**
 * Oturum yükündeki `earned_value` seviyesini YALNIZ bu sayfa için değiştirir
 * (`timesheet.spec.ts::withTimesheetLevel` deseni): paylaşılan mock durumu
 * HİÇ değişmez, `fullyParallel` altında başka spec'lerle yarış yoktur.
 * Navigasyondan ÖNCE çağrılmalıdır.
 */
export async function withEarnedValueLevel(page: Page, level: "view" | "draft" | "full" | "admin") {
  await page.route("**/api/auth/me", async (route) => {
    const response = await route.fetch();
    const me = (await response.json()) as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...me, permissions: { earned_value: level } }),
    });
  });
}

/**
 * AYP'yi açar ve ÜÇ bağımsız kaynağın da indiğini doğrular (GÖRSEL SPEC
 * KURALI 1. + 5. parça): şantiye seçenekleri (`/projects` + `/projects/{id}/
 * sites`) · ayar (`GET …/earned-value/settings`) · BOQ (`GET …/boq`, paçal
 * metrik tanımları kalem ADINI oradan basar).
 */
export async function openPlanningSettings(page: Page, siteId: string = ACTIVE_SITE_ID) {
  await page.goto(`${PLANNING_SETTINGS_URL}?site=${siteId}`);
  await expect(page.getByRole("heading", { level: 1, name: "Planlama Ayarları" })).toBeVisible();
  // (1) şantiye seçicisi çözüldü.
  await expect(page.getByLabel("Şantiye", { exact: true })).toHaveValue(siteId);
  // (2) ayar gövdesi forma indi (tolerans 2,00 → "2,0").
  await expect(page.getByLabel("Durum toleransı (puan)")).toHaveValue("2,0");
  await expect(page.getByLabel("Günlük kırmızı eşiği")).toHaveValue("0,95");
  // İskelet (`role=status` + `aria-busy`) kalmadı — ad hesaplanmadığı için özniteliğe bakılır.
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
}

/** AYP · A-Blok — BOQ'dan beslenen paçal tanımı basıldı (yalnız metrikli şantiye). */
export async function expectPacalDefinitionsLoaded(page: Page) {
  await expect(page.getByText("÷ C25/30 Beton (Döşeme) m³", { exact: false })).toBeVisible();
}

/** KAT'ı açar; katalog + disiplin listesinin İKİSİNİN de indiğini doğrular. */
export async function openUnitRateCatalog(page: Page) {
  await page.goto(UNIT_RATE_CATALOG_URL);
  await expect(page.getByRole("heading", { level: 1, name: "Birim Oran Kataloğu" })).toBeVisible();
  // (1) `GET /earned-value/catalog` — 16 iş tipi, özet çipi.
  await expect(page.getByRole("button", { name: "Beton döküm ayrıntıları" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Katalog özeti" })).toContainText("16 iş tipi");
  // (2) `GET /earned-value/disciplines` — süzgeç menüsü + renk kareleri.
  await expect(page.locator(".ev-cat-toolbar__swatches").getByTestId("discipline-swatch")).toHaveCount(3);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
}

/* ─────────────────────────── Adam-Saat Bütçesi (BÜT) ─────────────────────── */

export const MAN_HOUR_BUDGET_URL = "/planlama/adam-saat-butcesi";

/** Mock revizyon kimlikleri — `e2e/mock-backend.ts` `EV_REVISION_IDS` ile AYNI. */
export const BUDGET_REV_1_ACTIVE = "e7ae5000-0000-4000-8000-000000000101";

/**
 * BÜT penceresi — genişlik ORTAK (1440), yükseklik ağacın TAMAMINI alır.
 *
 * 🔴 NEDEN: oran ağacı (~50 satır) 900px'i aşar ve bu ekranın açılır
 * yüzeyleri (`AnchoredPopover escapeOverflow` — disiplin seçici, Kendi/Taşeron)
 * `position: fixed` ile PENCEREYE göre yerleşir. `fullPage` kadraj kaydırılmış
 * bir sayfada sabit yüzeyi yanlış yere basar; `prepareFrame`in kaydırma
 * sıfırlaması da yüzeyi yeniden yerleştirir. Pencere sayfadan uzun olunca
 * kaydırma HİÇ oluşmaz ve yüzey çapasının yanında kalır. `openManHourBudget`
 * sayfanın bu pencereye SIĞDIĞINI doğrular (sessizce kırpılmaz).
 */
export const MAN_HOUR_BUDGET_VIEWPORT = { width: 1440, height: 2800 } as const;

export interface BudgetTarget {
  siteId?: string;
  step?: 1 | 2 | 3 | 4;
  revisionId?: string;
}

function budgetUrl({ siteId = ACTIVE_SITE_ID, step, revisionId }: BudgetTarget): string {
  const params = new URLSearchParams({ site: siteId });
  if (revisionId) params.set("rev", revisionId);
  if (step && step > 1) params.set("adim", String(step));
  return `${MAN_HOUR_BUDGET_URL}?${params.toString()}`;
}

/**
 * BÜT'ü açar; başlık + revizyon listesi + adımın KENDİ kaynağı indi mi
 * (GÖRSEL SPEC KURALI 1. + 5. parça): Adım 1 ağaç · Adım 2 Gantt (`schedule`) ·
 * Adım 3 S-eğrisi (`preview`) · Adım 4 engel listesi + özet (`diff` + `preview`).
 */
export async function openManHourBudget(page: Page, target: BudgetTarget = {}) {
  await page.goto(budgetUrl(target));
  await expect(page.getByRole("heading", { level: 1, name: "Adam-Saat Bütçesi" })).toBeVisible();
  // `GET …/budget/revisions` — rozet satırındaki aktif revizyon çipi.
  await expect(page.locator(".ev-budget-head__active")).toContainText("Rev 1");
  const step = target.step ?? 1;
  if (step === 1) await expect(page.getByLabel("Adam-saat bütçe ağacı")).toBeVisible();
  if (step === 2) await expect(page.getByRole("img", { name: "Disiplin × bölüm pencereleri" })).toBeVisible();
  if (step === 3) {
    await expect(page.getByRole("img", { name: "Planlı S-eğrisi" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Haftalık gereken işçi" })).toBeVisible();
  }
  if (step === 4) await expect(page.getByRole("region", { name: "Baseline özeti" })).toBeVisible();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  // Ölçü EKRAN İÇERİĞİNİN dibidir, `scrollHeight` DEĞİL: kabuk `100vh + üst
  // şerit` yüksekliğindedir ve belge her pencerede 52px taşar (ölçüldü).
  const bottom = await page.locator(".ev-budget").evaluate((node) => node.getBoundingClientRect().bottom);
  expect(bottom, "BÜT içeriği pencereye sığmalı (MAN_HOUR_BUDGET_VIEWPORT)").toBeLessThanOrEqual(
    MAN_HOUR_BUDGET_VIEWPORT.height,
  );
}
